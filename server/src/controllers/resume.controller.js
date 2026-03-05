import crypto from 'crypto';
import Resume from "../models/resume.model.js";
import { calculateATSScore as ruleBasedScore } from "../utils/atsEngine.js";
import { calculateATSScore as hybridScore } from "../services/atsScorer.js";
import { generateInterviewPrep, callCloudflareAIStreaming, improveResumeStructured, improveResumeRegenerate, improveResumeStructuredV2, improveResumeRegenerateV2 } from "../services/ai.service.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { resumeDataToText, parseResumeToStructured } from "../utils/structuredResumeParser.js";
import { extractStructuredResume } from "../services/resumeStructure.service.js";
import { uploadFile, getFileStream, deleteFile } from "../services/storage.service.js";

// --- Versioning Helper ---
const createAndUploadVersion = async (resume, type) => {
    try {
        console.log(`[Versioning] Creating ${type} version for resume ${resume._id}`);
        const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
        const pdfBuffer = await generateResumePDF(resume);

        if (!pdfBuffer || pdfBuffer.length === 0) {
            console.error("[Versioning] Generated PDF buffer is empty");
            throw new Error("Generated PDF is empty");
        }
        console.log(`[Versioning] PDF generated: ${pdfBuffer.length} bytes`);

        const versionNumber = (resume.versionCounter || 0) + 1;
        const fileKey = `resumes/${resume.user}/v${versionNumber}-${Date.now()}.pdf`;

        await uploadFile(fileKey, pdfBuffer, "application/pdf");
        console.log(`[Versioning] PDF uploaded: ${fileKey}`);

        resume.versions.push({
            versionNumber,
            type,
            fileKey,
            atsScore: resume.atsScore || 0,
            resumeData: resume.resumeData,
            content: resume.parsedText || resume.originalContent || "",
            createdAt: new Date()
        });

        resume.versionCounter = versionNumber;
        await resume.save();
        console.log(`[Versioning] Version ${versionNumber} saved to DB`);
        return versionNumber;
    } catch (err) {
        console.error("[Versioning] Error creating/uploading version:", err);
        throw err;
    }
};

// --- Upload Pipeline ---
export const uploadResume = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No resume file uploaded" });
        }

        // Validate file types: Accept PDF, DOCX, TXT
        const allowedMimetypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];
        if (!allowedMimetypes.includes(file.mimetype) && !file.originalname.match(/\.(pdf|doc|docx|txt)$/i)) {
            return res.status(400).json({ message: "Only PDF, DOCX, and TXT files are allowed" });
        }

        // Extract Text immediately after upload
        let parsedText = "";
        try {
            parsedText = await extractTextFromFile(file);
        } catch (err) {
            console.error(`[Upload] Text Extraction Error for ${file.originalname}:`, err);
            return res.status(500).json({ message: "Failed to extract text from resume" });
        }

        if (!parsedText || parsedText.trim().length < 50) {
            return res.status(400).json({ message: "Could not extract sufficient text from the file. Please ensure it's not scanned or empty." });
        }

        // Generate unique key for R2 storage
        const timestamp = Date.now();
        const extension = file.originalname.includes('.') ? file.originalname.split('.').pop().toLowerCase() : 'pdf';
        const originalFileKey = `resumes/${userId}/${timestamp}.${extension}`;

        console.log(`[Upload] Uploading ${file.originalname} for user ${userId} to ${originalFileKey}`);

        // Upload to Cloudflare R2
        try {
            await uploadFile(originalFileKey, file.buffer, file.mimetype);
        } catch (storageError) {
            console.error(`[Upload] Storage Upload failed:`, storageError);
            return res.status(500).json({ message: "Cloud storage upload failed" });
        }

        // Store metadata in MongoDB (Resume Document creation)
        const resume = new Resume({
            user: userId,
            title: (file.originalname || "Uploaded Resume").replace(/\.[^/.]+$/, ""),
            originalFileKey, // Ensure originalFileKey is always saved
            versionCounter: 1,
            parsedText,
            originalContent: parsedText,
            atsScore: 0,
            versions: [{
                versionNumber: 1,
                atsScore: 0,
                type: 'original',
                fileKey: originalFileKey,
                content: parsedText,
                createdAt: new Date()
            }]
        });

        await resume.save();
        console.log(`[Upload] Successfully saved resume record to DB: ${resume._id}`);

        res.status(201).json({
            success: true,
            data: resume
        });
    } catch (error) {
        console.error(`[Upload] Global Resume Upload Error:`, error);
        res.status(500).json({ message: "Error uploading and processing resume" });
    }
};

// --- ATS Analysis ---
export const analyzeResumeATS = async (req, res) => {
    try {
        const { id } = req.params;
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
            resume.versions?.[resume.currentVersionIndex]?.content ||
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
        console.error("ATS Analysis Error:", error);
        res.status(500).json({ message: "Error during ATS analysis" });
    }
};

// --- CRUD Operations ---
export const saveResume = async (req, res) => {
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
        console.error("Save resume error:", error);
        res.status(500).json({ message: "Error saving resume" });
    }
};

export const getUserResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({ user: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: resumes });
    } catch (error) {
        res.status(500).json({ message: "Error fetching resumes" });
    }
};

export const getUserResumeById = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        console.log(`[getUserResumeById] Checking resume ${resume._id}`);
        // Removed automated migration logic for legacy resumes.
        // The system now handles resumes without structured data gracefully.

        return res.status(200).json({ success: true, data: resume });
    } catch (error) {
        console.error("Get resume by ID error:", error);
        res.status(500).json({ message: "Error fetching resume" });
    }
};

export const updateResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // Update top-level document
        Object.assign(resume, req.body);
        await resume.save();

        // Auto-commit a version on manual save
        await createAndUploadVersion(resume, "manual-edit");

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        console.error("Update resume error:", error);
        res.status(500).json({ message: "Error updating resume" });
    }
};

// --- Versioning Management ---
export const getResumeVersions = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        res.status(200).json({
            success: true,
            data: resume.versions.sort((a, b) => b.versionNumber - a.versionNumber)
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching versions" });
    }
};

export const restoreResumeVersion = async (req, res) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const targetVersion = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!targetVersion) {
            return res.status(404).json({ message: "Version not found" });
        }

        // Restore the data to the top-level document
        resume.resumeData = targetVersion.resumeData;
        resume.parsedText = targetVersion.content;
        resume.atsScore = targetVersion.atsScore;

        // Also update the pointer for visual rendering in some views if needed
        // but primarily the restore creates a NEW version snapshot too
        await resume.save();
        await createAndUploadVersion(resume, "restored");

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        console.error("Restore version error:", error);
        res.status(500).json({ message: "Error restoring version" });
    }
};

export const downloadVersionPDF = async (req, res) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const version = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!version || !version.fileKey) {
            return res.status(404).json({ message: "Version PDF not found" });
        }

        const { stream, contentLength } = await getFileStream(version.fileKey);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Resume_${versionNumber}.pdf"`);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        stream.pipe(res);
    } catch (error) {
        console.error("Version download error:", error);
        res.status(500).json({ message: "Error downloading version" });
    }
};

export const uploadVersionPDF = async (req, res) => {
    try {
        const { id, versionNumber } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No PDF file uploaded" });
        }

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const versionIndex = resume.versions.findIndex(v => v.versionNumber === Number(versionNumber));
        if (versionIndex === -1) {
            return res.status(404).json({ message: "Version not found" });
        }

        // Upload the new perfectly-rendered PDF blob to overwrite the backend `pdfkit` version
        const newFileKey = `resumes/${resume.user}/v${versionNumber}-${Date.now()}-rendered.pdf`;

        await uploadFile(newFileKey, file.buffer, "application/pdf");

        console.log(`[UploadVersionPDF] Overwritten version ${versionNumber} PDF: ${newFileKey}`);

        // Note: we let the old fileKey exist idly (or we could delete it, but S3 objects are cheap)
        resume.versions[versionIndex].fileKey = newFileKey;
        resume.markModified('versions');
        await resume.save();

        res.status(200).json({ success: true, message: "Version PDF uploaded successfully", newFileKey });
    } catch (error) {
        console.error("Version PDF upload error:", error);
        res.status(500).json({ message: "Error uploading version PDF" });
    }
};

export const viewVersionPDF = async (req, res) => {
    try {
        const { id, versionNumber } = req.params;
        console.log(`[ViewVersion] Request for resume ${id}, version ${versionNumber}`);
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const version = resume.versions.find(v => v.versionNumber === Number(versionNumber));
        if (!version || !version.fileKey) {
            console.error(`[ViewVersion] Version ${versionNumber} or fileKey not found`);
            return res.status(404).json({ message: "Version PDF not found" });
        }

        console.log(`[ViewVersion] Fetching from storage: ${version.fileKey}`);
        const { stream, contentLength } = await getFileStream(version.fileKey);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${resume.title}-v${versionNumber}.pdf"`);
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        stream.pipe(res);
        console.log(`[ViewVersion] Streaming started for ${version.fileKey}`);
    } catch (error) {
        console.error("[ViewVersion] Error:", error);
        res.status(500).json({ message: "Error viewing version" });
    }
};

// --- Cloned Resume Entity (Magic Improve V2) ---
export const cloneResume = async (req, res) => {
    try {
        const { id } = req.params;
        const { resumeData, atsScore, title, optimizedResumeText } = req.body;

        const originalResume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!originalResume) return res.status(404).json({ message: "Original resume not found" });

        const clonedResume = new Resume({
            user: req.user.id,
            title: title || `${originalResume.title} (Improved)`,
            resumeData: resumeData || originalResume.resumeData,
            atsScore: atsScore || originalResume.atsScore || 0,
            originalFileKey: originalResume.originalFileKey, // Preserve pointer to S3
            originalContent: optimizedResumeText || originalResume.originalContent,
            content: optimizedResumeText || originalResume.content,
            // Explicitly don't copy versions history to keep new entity clean.
            // Start a new version array.
            versions: [{
                versionNumber: 1,
                resumeData: resumeData || originalResume.resumeData,
                atsScore: atsScore || originalResume.atsScore || 0,
                type: "original", // Treat as the baseline for this new document
                fileKey: originalResume.originalFileKey || "",
                createdAt: new Date()
            }],
            versionCounter: 1
        });

        await clonedResume.save();
        res.status(201).json({ success: true, data: clonedResume });
    } catch (error) {
        console.error("Clone creation error:", error);
        res.status(500).json({ message: "Error cloning resume" });
    }
};

// --- AI Methods ---
export const rewriteSection = async (req, res) => {
    const { sectionText, instructions } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    const messages = [
        { role: "system", content: "Expert resume writer." },
        { role: "user", content: `Rewrite: ${sectionText}. Focus: ${instructions}` }
    ];
    await callCloudflareAIStreaming(messages, res, { temperature: 0.1 });
};

export const getInterviewPrep = async (req, res) => {
    try {
        const { resumeText, companyName } = req.body;

        if (!resumeText || !companyName) {
            return res.status(400).json({ message: "Resume text and company name required" });
        }

        const prepContent = await generateInterviewPrep(resumeText, companyName);

        res.status(200).json({
            success: true,
            data: prepContent
        });
    } catch (error) {
        console.error("Interview prep error:", error);
        res.status(500).json({ message: "Error generating interview prep" });
    }
};

// --- Magic Improve (Structured V2, Structured classic, Regenerate) ---
export const improveResume = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, jobDescription, mode = 'structured' } = req.body;

        // Correctly handle previousScore: preserve null/undefined as null, instead of Number(null) -> 0
        const previousScoreRaw = req.body.previousScore;
        const previousScore = (previousScoreRaw !== undefined && previousScoreRaw !== null) ? Number(previousScoreRaw) : null;

        if (!content) return res.status(400).json({ message: "Resume content is required" });

        console.log(`[Magic Improve] Mode: ${mode}, ID: ${id}`);

        let optimizedResume = null;
        let improvementSummary = '';
        let validationFallback = false;
        let optimizedResumeData = null;

        // ── V2 mode: structured JSON optimization via resumeData ─────────────
        if (mode === 'structured' && id) {
            const resume = await Resume.findOne({ _id: id, user: req.user.id });
            const storedResumeData = resume?.resumeData;

            if (storedResumeData?.personalInfo?.fullName || storedResumeData?.experience?.length) {
                // Fetch latest ATS context from the stored resume
                const atsContext = {
                    atsScore: resume.atsScore || previousScore,
                    missingCriticalSkills: [],  // will be enriched if analysisResults available
                    weakSections: [],
                    matchedSkills: [],
                };

                // ── Pass 1 ────────────────────────────────────────────────────
                let aiResult;
                try {
                    if (mode === 'regenerate') {
                        aiResult = await improveResumeRegenerateV2(storedResumeData, jobDescription || '', atsContext);
                    } else {
                        aiResult = await improveResumeStructuredV2(storedResumeData, jobDescription || '', atsContext);
                    }
                } catch (aiErr) {
                    console.error("[Magic Improve] AI Processing Error:", aiErr);
                    return res.status(503).json({ message: "AI Assistant is currently unavailable or timed out. Please try again later.", error: aiErr.message });
                }

                optimizedResumeData = aiResult.optimizedResumeData;
                improvementSummary = aiResult.optimizationSummary;
                validationFallback = aiResult.llmFallback;
                optimizedResume = resumeDataToText(optimizedResumeData);

                // ── Auto re-score after Pass 1 ────────────────────────────────
                let newScoreData = null;
                if (!validationFallback && jobDescription) {
                    try {
                        newScoreData = await hybridScore(optimizedResume, jobDescription, { previousScore });

                        // ── Pass 2 (if optimize mode, score still low, and delta small) ───────
                        const delta = newScoreData.scoreDelta ?? 0;
                        if (mode === 'optimize' && newScoreData.atsScore < 85 && delta < 5) {
                            console.log('[Magic Improve] Score low — running refinement pass 2');
                            let refineResult;
                            try {
                                refineResult = await improveResumeStructuredV2(
                                    optimizedResumeData,
                                    jobDescription,
                                    {
                                        atsScore: newScoreData.atsScore,
                                        missingCriticalSkills: newScoreData.missingCriticalSkills || [],
                                        weakSections: newScoreData.weakSections || [],
                                        matchedSkills: newScoreData.matchedSkills || [],
                                    }
                                );
                            } catch (aiErr) {
                                console.error("[Magic Improve] AI Pass 2 Error:", aiErr);
                                // Non-fatal, just continue with Pass 1 results
                                refineResult = { llmFallback: true };
                            }
                            if (!refineResult.llmFallback) {
                                optimizedResumeData = refineResult.optimizedResumeData;
                                optimizedResume = resumeDataToText(optimizedResumeData);
                                // Final re-score
                                newScoreData = await hybridScore(optimizedResume, jobDescription, { previousScore });
                            }
                        }
                    } catch (err) {
                        console.error('[Magic Improve] Post-improve ATS scoring failed:', err.message);
                    }
                }

                // ── Versioning Integration (Candidate Isolation) ────────────────
                // We DO NOT overwrite the root resume. We create a candidate version.
                // We temporarily construct the candidate to generate the PDF.
                const candidateObj = {
                    ...resume.toObject(),
                    resumeData: optimizedResumeData,
                    parsedText: optimizedResume,
                    atsScore: newScoreData?.atsScore || resume.atsScore,
                    versions: [] // Prevent infinite recursion during PDF generation
                };

                let newVersionNumber = null;
                try {
                    const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
                    const pdfBuffer = await generateResumePDF(candidateObj);

                    const fileKey = `resumes/${req.user.id}/${Date.now()}_v${(resume.versionCounter || 0) + 1}.pdf`;
                    await uploadFile(fileKey, pdfBuffer, 'application/pdf');

                    const versionType = mode === 'regenerate' ? 'regenerated' : 'optimized';

                    const newVersion = {
                        versionNumber: (resume.versionCounter || 0) + 1,
                        type: versionType,
                        fileKey: fileKey,
                        resumeData: optimizedResumeData,
                        content: optimizedResume,
                        atsScore: newScoreData?.atsScore || resume.atsScore,
                        analysis: newScoreData ? {
                            matchedSkills: newScoreData.matchedSkills || [],
                            missingSkills: newScoreData.missingSkills || [],
                            missingCriticalSkills: newScoreData.missingCriticalSkills || [],
                            suggestions: newScoreData.improvementSuggestions || []
                        } : undefined,
                        createdAt: new Date()
                    };

                    resume.versions.push(newVersion);
                    resume.versionCounter = (resume.versionCounter || 0) + 1;
                    await resume.save();
                    newVersionNumber = newVersion.versionNumber;
                } catch (pdfErr) {
                    console.error("[Candidate PDF] Error generating or saving version:", pdfErr);
                }

                return res.status(200).json({
                    success: true,
                    optimizedResume,
                    optimizedResumeData,
                    improvementSummary,
                    newScore: newScoreData?.atsScore || null,
                    scoreDelta: newScoreData?.scoreDelta || null,
                    llmFallback: validationFallback,
                    newAnalysis: newScoreData,
                    newVersionNumber // NEW: Tell frontend which version to render right-side
                });
            }
            // Fall through to classic mode if resumeData is empty
        }

        // ── Classic modes (regenerate or structured fallback) ────────────────
        // Pre-score to discover missing critical keywords before improve
        let missingKeywordsForPrompt = [];
        let fallbackPreviousScore = previousScore;

        if (jobDescription) {
            try {
                const preScore = ruleBasedScore(content, jobDescription);
                missingKeywordsForPrompt = preScore.missingCriticalSkills?.slice(0, 8) || [];

                // If frontend didn't send a previous score, use the pre-score result as the baseline
                if (fallbackPreviousScore === null) {
                    fallbackPreviousScore = preScore.atsScore;
                }
            } catch (err) {
                console.warn('[Magic Improve] Pre-score failed, proceeding without keyword hints:', err.message);
            }
        }

        let aiResult;
        if (mode === 'regenerate') {
            aiResult = await improveResumeRegenerate(content, jobDescription || '', missingKeywordsForPrompt);
        } else {
            aiResult = await improveResumeStructured(content, jobDescription || '', missingKeywordsForPrompt);
        }

        const { optimizedResume: classicResume, improvementSummary: classicSummary, llmFallback: classicFallback } = aiResult;

        let newScoreData = null;
        if (classicResume && jobDescription) {
            try {
                // Use the fallbackPreviousScore (either from frontend or from pre-score)
                newScoreData = await hybridScore(classicResume, jobDescription, { previousScore: fallbackPreviousScore });
            } catch (err) {
                console.error('Post-Improve ATS Scoring failed:', err.message);
            }
        }

        // ── Versioning Integration (Classic Candidate Isolation) ─────────────
        let newVersionNumber = null;
        if (id) {
            const resume = await Resume.findOne({ _id: id, user: req.user.id });
            if (resume) {
                const candidateObj = {
                    ...resume.toObject(),
                    parsedText: classicResume,
                    atsScore: newScoreData?.atsScore || resume.atsScore,
                    versions: []
                };

                try {
                    const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
                    const pdfBuffer = await generateResumePDF(candidateObj);

                    const fileKey = `resumes/${req.user.id}/${Date.now()}_v${(resume.versionCounter || 0) + 1}.pdf`;
                    await uploadFile(fileKey, pdfBuffer, 'application/pdf');

                    const versionType = mode === 'regenerate' ? 'regenerated' : 'optimized';

                    const newVersion = {
                        versionNumber: (resume.versionCounter || 0) + 1,
                        type: versionType,
                        fileKey: fileKey,
                        content: classicResume,
                        atsScore: newScoreData?.atsScore || resume.atsScore,
                        analysis: newScoreData ? {
                            matchedSkills: newScoreData.matchedSkills || [],
                            missingSkills: newScoreData.missingSkills || [],
                            missingCriticalSkills: newScoreData.missingCriticalSkills || [],
                            suggestions: newScoreData.improvementSuggestions || []
                        } : undefined,
                        createdAt: new Date()
                    };

                    resume.versions.push(newVersion);
                    resume.versionCounter = (resume.versionCounter || 0) + 1;
                    await resume.save();
                    newVersionNumber = newVersion.versionNumber;
                } catch (pdfErr) {
                    console.error("[Classic Candidate PDF] Error generating or saving version:", pdfErr);
                }
            }
        }

        return res.status(200).json({
            success: true,
            optimizedResume: classicResume,
            optimizedResumeData: null,
            improvementSummary: classicSummary,
            newScore: newScoreData?.atsScore || null,
            scoreDelta: newScoreData?.scoreDelta || null,
            llmFallback: classicFallback || false,
            newAnalysis: newScoreData,
            newVersionNumber // NEW: Tell frontend which version to target
        });

    } catch (error) {
        console.error('Magic Improve Error:', error);
        res.status(500).json({ message: error.message || 'Error during AI improvement' });
    }
};

export const improveResumeStreaming = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, jobDescription, mode = 'structured' } = req.body;
        const previousScoreRaw = req.body.previousScore;
        const previousScore = (previousScoreRaw !== undefined && previousScoreRaw !== null) ? Number(previousScoreRaw) : null;

        if (!content) return res.status(400).json({ message: "Resume content is required" });

        // 1. Setup SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 2. Pre-score baseline (required for keyword hints)
        let missingKeywords = [];
        let baselineScore = previousScore;
        if (jobDescription) {
            try {
                const preScore = ruleBasedScore(content, jobDescription);
                missingKeywords = preScore.missingCriticalSkills?.slice(0, 8) || [];
                if (baselineScore === null) baselineScore = preScore.atsScore;
            } catch (err) { }
        }

        // 3. Prepare Prompt
        const systemPrompt = mode === 'regenerate'
            ? `You are an expert technical resume writer. Output ONLY the rewritten resume as plain text. No JSON. No preamble.`
            : `You are a precise resume optimization engine. Surgically improve wording and action verbs for ATS. PRESERVE ALL ORIGINAL ROLES, DATES AND NUMBER OF BULLET POINTS. Output ONLY the improved resume as plain text. No JSON. No preamble.`;

        const keywordHint = missingKeywords.length > 0
            ? `\nCRITICAL — Try to naturally incorporate these missing skills: ${missingKeywords.join(', ')}\n`
            : '';

        const userPrompt = `Improve this resume for the JD.\nRULES: No fabrication. Maintain headings. Natural keyword integration.\n${keywordHint}\nRESUME:\n${content}\n\nJD:\n${jobDescription || ''}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        // 4. Stream from AI
        await callCloudflareAIStreaming(messages, res, {
            onComplete: async (finalText) => {
                let finalAnalysis = null;
                if (finalText && finalText.length > 100 && jobDescription) {
                    try {
                        finalAnalysis = await hybridScore(finalText, jobDescription, { previousScore: baselineScore });
                    } catch (err) { }
                }

                const meta = {
                    type: 'metadata',
                    newScore: finalAnalysis?.atsScore || null,
                    scoreDelta: finalAnalysis?.scoreDelta || null,
                    newAnalysis: finalAnalysis
                };

                // ── Versioning Integration (Streaming Candidate Isolation) ─────
                let newVersionNumber = null;
                if (id && finalText && finalText.length > 100) {
                    try {
                        const resume = await Resume.findOne({ _id: id, user: req.user.id });
                        if (resume) {
                            const candidateObj = {
                                ...resume.toObject(),
                                parsedText: finalText,
                                atsScore: finalAnalysis?.atsScore || resume.atsScore,
                                versions: []
                            };

                            const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
                            const pdfBuffer = await generateResumePDF(candidateObj);

                            const fileKey = `resumes/${req.user.id}/${Date.now()}_v${(resume.versionCounter || 0) + 1}.pdf`;
                            await uploadFile(fileKey, pdfBuffer, 'application/pdf');

                            const versionType = mode === 'regenerate' ? 'regenerated' : 'optimized';

                            const newVersion = {
                                versionNumber: (resume.versionCounter || 0) + 1,
                                type: versionType,
                                fileKey: fileKey,
                                content: finalText,
                                atsScore: finalAnalysis?.atsScore || resume.atsScore,
                                analysis: finalAnalysis ? {
                                    matchedSkills: finalAnalysis.matchedSkills || [],
                                    missingSkills: finalAnalysis.missingSkills || [],
                                    missingCriticalSkills: finalAnalysis.missingCriticalSkills || [],
                                    suggestions: finalAnalysis.improvementSuggestions || []
                                } : undefined,
                                createdAt: new Date()
                            };

                            resume.versions.push(newVersion);
                            resume.versionCounter = (resume.versionCounter || 0) + 1;
                            await resume.save();
                            newVersionNumber = newVersion.versionNumber;
                        }
                    } catch (vErr) {
                        console.error("[Streaming Versioning Candidate Fallback] Failed:", vErr.message);
                    }
                }

                // Append newVersionNumber to the final meta event
                const finalMeta = {
                    ...meta,
                    newVersionNumber
                };
                res.write(`data: ${JSON.stringify(finalMeta)}\n\n`);
            }
        });

    } catch (error) {
        console.error('Magic Improve Stream Error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};


// --- PDF Download ---
export const downloadResumePDF = async (req, res) => {
    try {
        const { id } = req.params;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // Dynamically import the PDF generator
        const { generateResumePDF } = await import("../services/pdfGenerator.service.js");
        const pdfBuffer = await generateResumePDF(resume);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resume.title || 'resume'}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF generation error:", error);
        res.status(500).json({ message: "Error generating PDF" });
    }
};

// --- Stream Original PDF from R2 ---
export const streamResumeFile = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[StreamFile] Request for resume ${id}`);
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });
        if (!resume.originalFileKey) {
            console.error(`[StreamFile] No originalFileKey for resume ${id}`);
            return res.status(404).json({ message: "No original file stored for this resume" });
        }

        console.log(`[StreamFile] Fetching from storage: ${resume.originalFileKey}`);
        let fileData;
        try {
            fileData = await getFileStream(resume.originalFileKey);
        } catch (err) {
            console.error(`[StreamFile] Fetch Failed: ${err.message}`);
            return res.status(404).json({ message: "File not found in storage" });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${resume.title || 'resume'}.pdf"`);
        if (fileData.contentLength) {
            res.setHeader('Content-Length', fileData.contentLength);
        }

        fileData.stream.pipe(res);
        console.log(`[StreamFile] Streaming started for ${resume.originalFileKey}`);
    } catch (error) {
        console.error("[StreamFile] Error:", error.message);
        res.status(500).json({ message: "Error streaming resume file" });
    }
};

// --- Delete Resume (with R2 cleanup) ---
export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

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
        res.status(200).json({ success: true, message: "Resume deleted" });
    } catch (error) {
        console.error("Delete resume error:", error);
        res.status(500).json({ message: "Error deleting resume" });
    }
};

/**
 * Manually trigger AI-powered structure generation from parsedText.
 */
export const generateResumeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });

        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" });
        }

        const textToParse = resume.parsedText || resume.originalContent || "";
        if (!textToParse || textToParse.length < 50) {
            return res.status(400).json({ success: false, message: "Resume has no text content to structure." });
        }

        console.log(`[generateResumeStructure] Generating structure for resume ${id}`);
        const structuredData = await extractStructuredResume(textToParse);

        resume.resumeData = structuredData;

        // Update current version if it exists
        if (resume.versions && resume.versions[resume.currentVersionIndex]) {
            resume.versions[resume.currentVersionIndex].resumeData = structuredData;
            resume.markModified('versions');
        }

        resume.markModified('resumeData');
        await resume.save();

        return res.status(200).json({
            success: true,
            message: "Resume structure generated successfully",
            data: structuredData
        });
    } catch (error) {
        console.error("[generateResumeStructure] Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate resume structure",
            error: error.message
        });
    }
};

/**
 * Commits a generated Magic Improve candidate version to the active root document.
 * This is called when the user clicks "Use Improved" after comparing visually.
 */
export const commitVersion = async (req, res) => {
    try {
        const { id, versionNumber } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });

        if (!resume) {
            return res.status(404).json({ success: false, message: "Resume not found" });
        }

        const exactVersion = resume.versions.find(v => v.versionNumber === parseInt(versionNumber, 10));
        if (!exactVersion) {
            return res.status(404).json({ success: false, message: "Specified candidate version not found" });
        }

        // Promote candidate version data to the active root state
        resume.parsedText = exactVersion.content || resume.parsedText;
        if (exactVersion.resumeData) {
            resume.resumeData = exactVersion.resumeData;
        }
        resume.atsScore = exactVersion.atsScore || resume.atsScore;
        if (exactVersion.analysis) {
            resume.analysis = exactVersion.analysis;
        }

        await resume.save();

        return res.status(200).json({
            success: true,
            message: "Version successfully committed to active state.",
            data: resume
        });
    } catch (error) {
        console.error("Error committing version:", error);
        return res.status(500).json({ success: false, message: "Failed to commit improved version" });
    }
};
