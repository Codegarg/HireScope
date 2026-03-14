import Resume from "../models/resume.model.js";
import { ruleBasedATSScore as ruleBasedScore } from "../utils/atsEngine.js";
import { calculateATSScore as hybridScore } from "../services/atsScorer.js";
import { generateInterviewPrep, callCloudflareAIStreaming, improveResumeStructured, stripPreamble } from "../services/ai.service.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { uploadResume as uploadResumeToStorage, uploadResumeVersion, getFileStream, deleteFile, validateFileKey } from "../services/storage.service.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../middlewares/error.middleware.js";

/**
 * Sanitize a string so it is safe to use as an HTTP Content-Disposition filename.
 * Keeps only printable ASCII, replaces anything else with an underscore.
 */
const safeFilename = (name, fallback = 'resume') => {
    if (!name || typeof name !== 'string') return fallback;
    // Replace any character that is NOT a safe filename character with _
    const cleaned = name.replace(/[^a-zA-Z0-9 ._-]/g, '_').trim();
    return cleaned || fallback;
};

// --- Upload Pipeline ---
export const uploadResume = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        logger.upload('Processing new resume upload request', { userId, filename: file?.originalname });

        // 1. Guard: ensure a file was attached
        if (!file) {
            throw new ApiError(400, "No resume file uploaded");
        }

        // 2. Extract plain text from the file buffer
        let parsedText = "";
        try {
            parsedText = await extractTextFromFile(file);
        } catch (extractErr) {
            console.error(`[Upload] Text extraction failed for ${file.originalname}:`, extractErr);
            return res.status(500).json({ message: "Failed to extract text from resume" });
        }

        if (!parsedText || parsedText.trim().length < 50) {
            return res.status(400).json({
                message: "Could not extract sufficient text from the file. Please ensure it is not scanned or empty."
            });
        }

        // 3. Upload file to Cloudflare R2 via storage service (key generation lives there)
        let originalFileKey;
        try {
            originalFileKey = await uploadResumeToStorage(
                userId,
                file.buffer,
                file.mimetype,
                file.originalname
            );
        } catch (storageErr) {
            console.error(`[Upload] Cloud storage upload failed:`, storageErr);
            return res.status(500).json({ message: "Cloud storage upload failed. Please try again." });
        }

        // Defensive validation — ensure storage service returned a valid key format
        if (!validateFileKey(originalFileKey)) {
            console.error(`[Upload] Invalid fileKey returned for user ${userId}: ${originalFileKey}`);
            return res.status(500).json({ message: "Storage service returned an invalid file key" });
        }

        // 4. Extract structured data (JSON) via AI service
        let content = null;
        try {
            const { extractStructuredResume } = await import("../services/resumeStructure.service.js");
            content = await extractStructuredResume(parsedText);
        } catch (aiErr) {
            console.warn(`[Upload] AI Structure extraction failed (falling back to plain text):`, aiErr.message);
            // Non-critical: allow upload even if AI fails to structure it
        }

        // 5. Persist resume document to MongoDB
        const resume = new Resume({
            user: userId,
            title: (file.originalname || "Uploaded Resume").replace(/\.[^/.]+$/, ""),
            originalFileKey,           // ← always set; guaranteed by step 3
            parsedText,
            content,                   // ← Structured JSON
            originalContent: parsedText,
            atsScore: 0,
            versionCounter: 1,
            versions: [{
                versionNumber: 1,
                atsScore: 0,
                type: 'original',
                fileKey: originalFileKey,
                createdAt: new Date()
            }]
        });

        await resume.save();
        logger.upload('Resume upload successful', { resumeId: resume._id, userId });
        return res.status(201).json({ success: true, data: resume });

    } catch (error) {
        logger.error('UPLOAD', 'Unexpected error in uploadResume', { error: error.message, userId: req.user?.id });
        next(error);
    }
};

// --- ATS Analysis ---
export const analyzeResumeATS = async (req, res, next) => {
    try {
        const { id } = req.params;
        logger.analysis('ATS analysis requested', { resumeId: id, userId: req.user?.id });
        let { jobDescription, resumeContent: manualContent } = req.body;
        const jdFile = req.file;

        // Support previousScore for delta computation (post-Magic Improve)
        const previousScore =
            req.body.previousScore !== undefined ? Number(req.body.previousScore) : null;

        // Extract text from JD file if provided
        if (jdFile) {
            try {
                jobDescription = await extractTextFromFile(jdFile);
            } catch (err) {
                console.error("JD Extraction Error:", err);
                return res.status(400).json({ message: "Failed to extract text from JD file" });
            }
        }

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // PRIORITIZE manualContent if sent (real-time analysis before save)
        const resumeContent =
            manualContent ||
            resume.parsedText ||
            resume.originalContent ||
            "";

        // ── Hybrid ATS scoring (rule-based 70% + Llama 3 30%) ──────────────
        const analysisResults = await hybridScore(resumeContent, jobDescription, { previousScore });

        // ── Persist new score to DB ─────────────────────────────────────────
        if (analysisResults && typeof analysisResults.atsScore === 'number') {
            resume.atsScore = analysisResults.atsScore;
            resume.analysis = {
                matchedSkills: analysisResults.matchedSkills || [],
                missingSkills: analysisResults.missingSkills || [],
                missingCriticalSkills: analysisResults.missingCriticalSkills || [],
                suggestions: analysisResults.improvementSuggestions || []
            };
            const issuesCount =
                (analysisResults.missingCriticalSkills?.length || 0) +
                (analysisResults.weakSections?.length || 0) +
                (analysisResults.analysis?.formattingIssues?.length || 0);
            resume.suggestionsCount = issuesCount;
            await resume.save();
        }

        res.status(200).json({
            success: true,
            data: analysisResults
        });
    } catch (error) {
        logger.error('ANALYSIS', 'ATS Analysis Error', { error: error.message, resumeId: req.params.id });
        next(error);
    }
};

// --- CRUD Operations ---
export const saveResume = async (req, res, next) => {
    try {
        const reqBody = { ...req.body, user: req.user.id };

        const isEmptyData = (data) => {
            if (!data) return true;
            if (Object.keys(data).length === 0) return true;
            const noExp = !data.experience || data.experience.length === 0;
            const noEdu = !data.education || data.education.length === 0;
            const noProj = !data.projects || data.projects.length === 0;
            const noName = !data.personalInfo || !data.personalInfo.fullName;
            return noExp && noEdu && noProj && noName;
        };

        // Removed mandatory parsedText -> resumeData conversion
        // Structured data is now optional.

        const resume = new Resume(reqBody);
        await resume.save();
        res.status(201).json({ success: true, data: resume });
    } catch (error) {
        logger.error('DB', 'Save resume error', { error: error.message, userId: req.user?.id });
        next(error);
    }
};

export const getUserResumes = async (req, res, next) => {
    try {
        const resumes = await Resume.find({ user: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: resumes });
    } catch (error) {
        next(error);
    }
};

export const getUserResumeById = async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        return res.status(200).json({ success: true, data: resume });
    } catch (error) {
        next(error);
    }
};

export const updateResume = async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        // Apply field updates (content, parsedText, title etc)
        if (req.body.content !== undefined) resume.content = req.body.content;
        if (req.body.parsedText !== undefined) resume.parsedText = req.body.parsedText;
        if (req.body.title !== undefined) resume.title = req.body.title;
        if (req.body.atsScore !== undefined) resume.atsScore = req.body.atsScore;

        let fileKey = null;

        // If content or parsedText changed, we MUST regenerate the PDF
        if (req.body.content || req.body.parsedText) {
            const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
            const { uploadResumeVersion } = await import("../services/storage.service.js");

            const pdfBuffer = await generateResumePDF(resume);

            const newVersionNumber = (resume.versionCounter || 0) + 1;
            fileKey = await uploadResumeVersion(req.user.id, newVersionNumber, pdfBuffer, 'manual-edit');

            resume.versions.push({
                versionNumber: newVersionNumber,
                type: 'manual-edit',
                fileKey: fileKey,
                atsScore: resume.atsScore || 0,
                createdAt: new Date()
            });
            resume.versionCounter = newVersionNumber;
            resume.markModified('versions');
        } else {
            // No content change, just metadata update
            // (Optional: could push a version for title changes, but typically not needed)
        }

        await resume.save();
        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        next(error);
    }
};

export const getResumeVersions = async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        res.status(200).json({
            success: true,
            data: resume.versions.sort((a, b) => b.versionNumber - a.versionNumber)
        });
    } catch (error) {
        next(error);
    }
};

export const restoreResumeVersion = async (req, res, next) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        const targetVersion = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!targetVersion) {
            throw new ApiError(404, "Version not found");
        }

        // Restore root document fields from the target version
        resume.atsScore = targetVersion.atsScore || resume.atsScore;

        // Reuse the target version's fileKey — no new PDF needed
        const newVersionNumber = (resume.versionCounter || 0) + 1;
        resume.versions.push({
            versionNumber: newVersionNumber,
            type: 'restored',
            fileKey: targetVersion.fileKey || resume.originalFileKey || '',
            atsScore: targetVersion.atsScore || 0,
            createdAt: new Date()
        });
        resume.versionCounter = newVersionNumber;
        resume.markModified('versions');

        await resume.save();
        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        next(error);
    }
};

export const downloadVersionPDF = async (req, res, next) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const version = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!version || !version.fileKey) {
            throw new ApiError(404, "Version PDF not found");
        }

        const { stream, contentLength } = await getFileStream(version.fileKey);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(resume.title)}_v${versionNumber}.pdf"`);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        stream.pipe(res);
    } catch (error) {
        next(error);
    }
};

export const uploadVersionPDF = async (req, res, next) => {
    try {
        const { id, versionNumber } = req.params;
        const file = req.file;

        if (!file) throw new ApiError(400, "No PDF file uploaded");

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        const versionIndex = resume.versions.findIndex(v => v.versionNumber === Number(versionNumber));
        if (versionIndex === -1) {
            throw new ApiError(404, "Version not found");
        }

        // Upload the new perfectly-rendered PDF blob via centralized storage service
        const newFileKey = await uploadResumeVersion(resume.user, versionNumber, file.buffer);

        console.log(`[UploadVersionPDF] Overwritten version ${versionNumber} PDF: ${newFileKey}`);

        // Note: we let the old fileKey exist idly (or we could delete it, but S3 objects are cheap)
        if (!validateFileKey(newFileKey)) {
            return res.status(500).json({ message: "Failed to generate a valid file key for version" });
        }

        resume.versions[versionIndex].fileKey = newFileKey;
        resume.markModified('versions');
        await resume.save();

        res.status(200).json({ success: true, message: "Version PDF uploaded successfully", newFileKey });
    } catch (error) {
        next(error);
    }
};

export const viewVersionPDF = async (req, res, next) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        const version = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!version || !version.fileKey) {
            throw new ApiError(404, "Version PDF not found");
        }

        // If the stored file is not a .pdf (e.g. original .docx upload), generate PDF on-the-fly
        const isPdf = version.fileKey.toLowerCase().endsWith('.pdf');

        if (!isPdf) {
            // Generate a PDF from the resume's parsedText/content
            const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
            const pdfBuffer = await generateResumePDF(resume);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${safeFilename(resume.title)}_v${versionNumber}.pdf"`);
            return res.send(pdfBuffer);
        }

        const { stream, contentLength } = await getFileStream(version.fileKey);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename(resume.title)}_v${versionNumber}.pdf"`);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        stream.pipe(res);
    } catch (error) {
        next(error);
    }
};

// --- Cloned Resume Entity (Magic Improve V2) ---
export const cloneResume = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { atsScore, title, optimizedResumeText } = req.body;

        const originalResume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!originalResume) throw new ApiError(404, "Original resume not found");

        const clonedResume = new Resume({
            user: req.user.id,
            title: title || `${originalResume.title} (Improved)`,
            atsScore: atsScore || originalResume.atsScore || 0,
            originalFileKey: originalResume.originalFileKey,
            parsedText: optimizedResumeText || originalResume.parsedText,
            originalContent: optimizedResumeText || originalResume.originalContent,
            versions: [{
                versionNumber: 1,
                atsScore: atsScore || originalResume.atsScore || 0,
                type: "original",
                fileKey: originalResume.originalFileKey || "",
                content: optimizedResumeText || originalResume.parsedText || "",
                createdAt: new Date()
            }],
            versionCounter: 1
        });

        await clonedResume.save();
        res.status(201).json({ success: true, data: clonedResume });
    } catch (error) {
        next(error);
    }
};

// --- AI Methods ---
export const rewriteSection = async (req, res, next) => {
    const { sectionText, instructions } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    const messages = [
        { role: "system", content: "Expert resume writer." },
        { role: "user", content: `Rewrite: ${sectionText}. Focus: ${instructions}` }
    ];
    await callCloudflareAIStreaming(messages, res, { temperature: 0.1 });
};

export const getInterviewPrep = async (req, res, next) => {
    try {
        const { resumeText, companyName } = req.body;

        if (!resumeText || !companyName) {
            throw new ApiError(400, "Resume text and company name required");
        }

        const prepContent = await generateInterviewPrep(resumeText, companyName);

        res.status(200).json({
            success: true,
            data: prepContent
        });
    } catch (error) {
        next(error);
    }
};

// --- Magic Improve shared helper: generate PDF, upload to R2, push version ---
const createImproveVersion = async (resume, improvedText, atsScore, mode, userId) => {
    const versionType = mode === 'regenerate' ? 'regenerated' : 'optimized';
    const { generateResumePDF } = await import("../services/pdfGenerator.service.js");

    const candidateObj = { ...resume.toObject(), parsedText: improvedText, atsScore, versions: [] };

    // Detect if AI returned JSON
    try {
        const parsedStr = improvedText.trim();
        if (parsedStr.startsWith('{') && parsedStr.endsWith('}')) {
            const parsedJson = JSON.parse(parsedStr);
            if (parsedJson && typeof parsedJson === 'object') {
                candidateObj.content = parsedJson;
            }
        }
    } catch (e) {
        // Not JSON or invalid JSON, fall back to default behavior
    }
    const pdfBuffer = await generateResumePDF(candidateObj);

    if (!pdfBuffer || pdfBuffer.length === 0) throw new Error("Generated PDF is empty");

    const newVersionNumber = (resume.versionCounter || 0) + 1;
    const fileKey = await uploadResumeVersion(userId, newVersionNumber, pdfBuffer, versionType);

    resume.versions.push({
        versionNumber: newVersionNumber,
        type: versionType,
        fileKey,
        atsScore: atsScore || 0,
        createdAt: new Date()
    });
    resume.versionCounter = newVersionNumber;
    await resume.save();

    logger.ai('Resume version created successfully', { resumeId: resume._id, versionNumber: newVersionNumber, type: versionType });
    return newVersionNumber;
};

// --- Magic Improve (JSON, non-streaming) ---
// Mode 1: optimize — preserves layout, improves wording/ATS
// Mode 2: regenerate — AI can restructure, add/remove sections
export const improveResume = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content, jobDescription, mode = 'structured' } = req.body;

        const previousScoreRaw = req.body.previousScore;
        const previousScore = (previousScoreRaw !== undefined && previousScoreRaw !== null) ? Number(previousScoreRaw) : null;

        // Full ATS context passed from frontend (from previous user analysis run)
        const atsContextFromFrontend = req.body.atsContext || null;

        if (!content) return res.status(400).json({ message: "Resume content is required" });

        console.log(`[Magic Improve] Mode: ${mode}, ID: ${id}`);

        // Pre-score baseline — fast sync rule engine for keyword hints
        let missingKeywordsForPrompt = [];
        let fallbackPreviousScore = previousScore;

        if (jobDescription) {
            try {
                const preScore = ruleBasedScore(content, jobDescription);
                missingKeywordsForPrompt = preScore.missingCriticalSkills?.slice(0, 8) || [];
                if (fallbackPreviousScore === null) fallbackPreviousScore = preScore.atsScore;
            } catch (err) {
                console.warn('[Magic Improve] Pre-score failed:', err.message);
            }
        }

        // Merge frontend ATS context with rule engine results
        // Frontend context takes precedence (it came from the full hybrid scoring run)
        const atsContext = {
            atsScore: atsContextFromFrontend?.atsScore ?? fallbackPreviousScore,
            matchedSkills: atsContextFromFrontend?.matchedSkills || [],
            missingCriticalSkills: atsContextFromFrontend?.missingCriticalSkills || missingKeywordsForPrompt,
            weakSections: atsContextFromFrontend?.weakSections || [],
            breakdown: atsContextFromFrontend?.breakdown || {}
        };

        // Run the AI optimization (layout preserving)
        const aiResult = await improveResumeStructured(content, jobDescription || '', missingKeywordsForPrompt, atsContext);

        const { optimizedResume: improvedText, improvementSummary, llmFallback } = aiResult;

        // Post-improve ATS scoring
        let newScoreData = null;
        if (improvedText && jobDescription) {
            try {
                newScoreData = await hybridScore(improvedText, jobDescription, { previousScore: fallbackPreviousScore });
            } catch (err) {
                console.error('[Magic Improve] Post-score failed:', err.message);
            }
        }

        // Generate PDF, upload to R2, create version
        let newVersionNumber = null;
        if (id && improvedText) {
            const resume = await Resume.findOne({ _id: id, user: req.user.id });
            if (resume) {
                try {
                    newVersionNumber = await createImproveVersion(
                        resume,
                        improvedText,
                        newScoreData?.atsScore || resume.atsScore,
                        mode,
                        req.user.id
                    );
                } catch (vErr) {
                    console.error('[Magic Improve] Version creation failed:', vErr.message);
                }
            }
        }

        return res.status(200).json({
            success: true,
            optimizedResume: improvedText,
            improvementSummary,
            newScore: newScoreData?.atsScore || null,
            scoreDelta: newScoreData?.scoreDelta || null,
            llmFallback: llmFallback || false,
            newAnalysis: newScoreData,
            newVersionNumber
        });

    } catch (error) {
        logger.error('AI', 'Magic Improve Error', { error: error.message, resumeId: req.params.id });
        next(error);
    }
};

export const improveResumeStreaming = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content, jobDescription, mode = 'structured' } = req.body;
        const previousScoreRaw = req.body.previousScore;
        const previousScore = (previousScoreRaw !== undefined && previousScoreRaw !== null) ? Number(previousScoreRaw) : null;

        if (!content) return res.status(400).json({ message: "Resume content is required" });

        // Setup SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Check if we have a structured JSON version to act upon
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        const hasJsonContent = resume && resume.content && Object.keys(resume.content).length > 0;
        let contentToOptimize = content;

        if (hasJsonContent) {
            contentToOptimize = JSON.stringify(resume.content, null, 2);
        }

        // Pre-score baseline
        let missingKeywords = [];
        let baselineScore = previousScore;
        if (jobDescription) {
            try {
                const preScore = ruleBasedScore(contentToOptimize, jobDescription);
                missingKeywords = preScore.missingCriticalSkills?.slice(0, 10) || [];
                if (baselineScore === null) baselineScore = preScore.atsScore;
            } catch (err) { }
        }

        const originalFirstLine = content.split('\n').find(l => l.trim().length > 0) || '';
        const keywordBlock = missingKeywords.length > 0
            ? `\nMISSING KEYWORDS TO INJECT NATURALLY:\n${missingKeywords.join(', ')}\n`
            : '';

        const systemPrompt = `You are a "Surgical Resume Weaver". 
Your ONLY purpose is to weave keywords into a resume WITHOUT changing its length, layout, design, or line count.

ABSOLUTE STRICT CONSTRAINTS:
1. DO NOT add any new lines, bullet points, or sections. Replace weak words with keywords instead.
2. The final output MUST have exactly the same number of lines as the input.
3. DO NOT add any preamble, titles, timestamps, or headers like "ANALYSIS", "IMPROVED", or "REVISION".
4. START THE RESPONSE DIRECTLY with the name EXACTLY as it appears here: "${originalFirstLine}". No conversational filler.
5. PRESERVE every single original header, contact detail, and layout character exactly as written.
6. Ensuring the resume stays within the SAME PAGE COUNT is your highest priority.
7. Output nothing but the optimized resume text.`;

        const userPrompt = `ORIGINAL RESUME:\n${content}\n${keywordBlock}\nINSTRUCTION: Weave the keywords into existing bullets. Keep the exact same line count. NO extra headers. Start directly with "${originalFirstLine}".`;

        const { callCloudflareAIStreaming, stripPreamble } = await import("../services/ai.service.js");

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        await callCloudflareAIStreaming(messages, res, {
            temperature: 0,
            max_tokens: 4096,
            onComplete: async (fullAiResponse) => {
                // 1. Basic cleaning
                let cleanedText = fullAiResponse
                    .replace(/```[\w]*\n?/gi, '')
                    .replace(/```/g, '')
                    .trim();

                // 2. Structural stripping
                cleanedText = stripPreamble(cleanedText, originalFirstLine);

                let finalAnalysis = null;
                if (cleanedText && cleanedText.length > 50 && jobDescription) {
                    try {
                        finalAnalysis = await hybridScore(cleanedText, jobDescription, { previousScore: baselineScore });
                    } catch (err) {
                        console.error("[Streaming] Post-score failed:", err);
                    }
                }

                let newVersionNumber = null;
                if (id && cleanedText && cleanedText.length > 50) {
                    try {
                        const resume = await Resume.findOne({ _id: id, user: req.user.id });
                        if (resume) {
                            newVersionNumber = await createImproveVersion(
                                resume,
                                cleanedText,
                                finalAnalysis?.atsScore || resume.atsScore,
                                mode,
                                req.user.id
                            );
                        }
                    } catch (vErr) {
                        console.error("[Streaming] Version creation failed:", vErr.message);
                    }
                }

                // Send the final metadata chunk
                res.write(`data: ${JSON.stringify({
                    type: 'metadata',
                    newScore: finalAnalysis?.atsScore || null,
                    scoreDelta: finalAnalysis?.scoreDelta || null,
                    newAnalysis: finalAnalysis,
                    newVersionNumber
                })}\n\n`);
                res.write('data: [DONE]\n\n');
            }
        });

    } catch (error) {
        console.error("Improvement error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};



// --- PDF Download ---
export const downloadResumePDF = async (req, res, next) => {
    try {
        const { id } = req.params;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        // Dynamically import the PDF generator
        const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
        const pdfBuffer = await generateResumePDF(resume);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(resume.title)}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        next(error);
    }
};

// --- Extract Structured JSON — used to migrate old resumes to manual editing ---
export const extractResumeStructure = async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        if (resume.content) {
            return res.status(200).json({ success: true, data: resume.content });
        }

        const { extractStructuredResume } = await import("../services/resumeStructure.service.js");
        const content = await extractStructuredResume(resume.parsedText);

        resume.content = content;
        await resume.save();

        res.status(200).json({ success: true, data: content });
    } catch (error) {
        next(error);
    }
};

// --- Stream Resume PDF from R2 (latest version or original fallback) ---
export const streamResumeFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        // Resolve the best available fileKey:
        // 1. Latest version's fileKey (highest versionNumber that has a fileKey)
        // 2. Fallback to originalFileKey
        let fileKey = resume.originalFileKey || null;
        if (resume.versions && resume.versions.length > 0) {
            const sorted = [...resume.versions]
                .filter(v => v.fileKey)
                .sort((a, b) => b.versionNumber - a.versionNumber);
            if (sorted.length > 0) fileKey = sorted[0].fileKey;
        }

        if (!fileKey) {
            logger.error('STORAGE', 'No fileKey found', { resumeId: id });
            throw new ApiError(404, "No PDF file stored for this resume");
        }

        console.log(`[StreamFile] Fetching: ${fileKey}`);
        let stream, contentLength;
        try {
            const result = await getFileStream(fileKey);
            stream = result.stream;
            contentLength = result.contentLength;
        } catch (err) {
            // If the latest version's file is missing, retry with originalFileKey
            if (fileKey !== resume.originalFileKey && resume.originalFileKey) {
                console.warn(`[StreamFile] Latest version file missing, falling back to originalFileKey`);
                const result = await getFileStream(resume.originalFileKey);
                stream = result.stream;
                contentLength = result.contentLength;
                fileKey = resume.originalFileKey;
            } else {
                throw new ApiError(404, "File not found in storage");
            }
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename(resume.title)}.pdf"`);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        stream.pipe(res);
    } catch (error) {
        next(error);
    }
};


export const deleteResume = async (req, res, next) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) throw new ApiError(404, "Resume not found");

        // Delete original PDF from R2 if stored and ONLY if no other resumes point to it
        if (resume.originalFileKey) {
            try {
                const count = await Resume.countDocuments({ originalFileKey: resume.originalFileKey });
                // Note: count includes the one we are about to delete, so if it's strictly > 1, don't delete from S3
                if (count <= 1) {
                    await deleteFile(resume.originalFileKey);
                    console.log(`[Storage] Deleted: ${resume.originalFileKey}`);
                } else {
                    console.log(`[Storage] Skipping deletion of ${resume.originalFileKey} because ${count - 1} other resumes reference it.`);
                }
            } catch (storageErr) {
                // Log but continue — don't block DB deletion if storage fails
                console.error(`[Storage] Delete failed for key ${resume.originalFileKey}:`, storageErr.message);
            }
        }

        await Resume.deleteOne({ _id: id, user: req.user.id });
        logger.auth('Resume deleted', { resumeId: id, userId: req.user?.id });
        res.status(200).json({ success: true, message: "Resume deleted" });
    } catch (error) {
        next(error);
    }
};



/**
 * Commits a generated Magic Improve candidate version to the active root document.
 * This is called when the user clicks "Use Improved" after comparing visually.
 */
export const commitVersion = async (req, res, next) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });

        if (!resume) {
            throw new ApiError(404, "Resume not found");
        }

        const { improvedText, analysis } = req.body;

        const exactVersion = resume.versions.find(v => v.versionNumber === parseInt(versionNumber, 10));
        if (!exactVersion) {
            throw new ApiError(404, "Specified candidate version not found");
        }

        // Promote candidate version data to the active root state
        try {
            if (improvedText) {
                const parsedStr = improvedText.trim();
                if (parsedStr.startsWith('{') && parsedStr.endsWith('}')) {
                    const parsedJson = JSON.parse(parsedStr);
                    if (parsedJson && typeof parsedJson === 'object') {
                        resume.content = parsedJson;
                    } else {
                        resume.parsedText = improvedText;
                    }
                } else {
                    resume.parsedText = improvedText;
                }
            }
        } catch (e) {
            resume.parsedText = improvedText || resume.parsedText;
        }

        resume.atsScore = exactVersion.atsScore || resume.atsScore;

        // Update the root analysis details if provided
        if (analysis) {
            resume.analysis = {
                matchedSkills: analysis.matchedSkills || [],
                missingSkills: analysis.missingSkills || [],
                missingCriticalSkills: analysis.missingCriticalSkills || [],
                suggestions: analysis.improvementSuggestions || []
            };
            resume.suggestionsCount = (analysis.missingCriticalSkills?.length || 0) + (analysis.weakSections?.length || 0);
        }

        await resume.save();

        return res.status(200).json({
            success: true,
            message: "Version successfully committed to active state.",
            data: resume
        });
    } catch (error) {
        next(error);
    }
};
