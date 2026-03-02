import crypto from 'crypto';
import Resume from "../models/resume.model.js";
import { calculateATSScore as ruleBasedScore } from "../utils/atsEngine.js";
import { calculateATSScore as hybridScore } from "../services/atsScorer.js";
import { generateInterviewPrep, callCloudflareAIStreaming, improveResumeStructured, improveResumeRegenerate, improveResumeStructuredV2, improveResumeRegenerateV2 } from "../services/ai.service.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { resumeDataToText } from "../utils/structuredResumeParser.js";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../utils/r2Client.js";

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
            resume.originalContent ||
            "";

        // ── Hybrid ATS scoring (rule-based 70% + Llama 3 30%) ──────────────
        const analysisResults = await hybridScore(resumeContent, jobDescription, { previousScore });

        // ── Persist new score to DB ─────────────────────────────────────────
        if (analysisResults && typeof analysisResults.atsScore === 'number') {
            resume.atsScore = analysisResults.atsScore;
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
        const resume = new Resume({ ...req.body, user: req.user.id });
        await resume.save();
        res.status(201).json({ success: true, data: resume });
    } catch (error) {
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
        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ message: "Error fetching resume" });
    }
};

export const updateResume = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // Update top-level document with new body fields (e.g., resumeData, title, etc)
        const updatedResume = await Resume.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: req.body },
            { new: true }
        );

        // Auto-commit a version on every save
        if (updatedResume && updatedResume.resumeData) {
            updatedResume.versions.push({
                versionId: crypto.randomUUID(),
                atsScore: updatedResume.atsScore || 0,
                resumeData: updatedResume.resumeData,
                type: "manual_edit",
                createdAt: new Date()
            });
            await updatedResume.save();
        }

        res.status(200).json({ success: true, data: updatedResume });
    } catch (error) {
        console.error("Update resume error:", error);
        res.status(500).json({ message: "Error updating resume" });
    }
};

// --- Versioning ---
// This is used for generating an explicit version snapshot if needed outside the normal update cycle
export const createResumeVersion = async (req, res) => {
    try {
        const { resumeId, resumeData, atsScore, type } = req.body;

        const resume = await Resume.findOne({ _id: resumeId, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        resume.versions.push({
            versionId: crypto.randomUUID(),
            resumeData: resumeData || resume.resumeData,
            atsScore: atsScore || resume.atsScore || 0,
            type: type || "manual_edit",
            createdAt: new Date()
        });

        await resume.save();

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        console.error("Version creation error:", error);
        res.status(500).json({ message: "Error creating version" });
    }
};

export const restoreVersion = async (req, res) => {
    try {
        const { id } = req.params;
        const { versionId } = req.body;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const targetVersion = resume.versions.find(v => v.versionId === versionId);
        if (!targetVersion) {
            return res.status(404).json({ message: "Target version not found" });
        }

        // Restoring pushes a NEW snapshot acting as the "restored" state
        // and updates the top level document
        resume.resumeData = targetVersion.resumeData;
        resume.atsScore = targetVersion.atsScore;

        resume.versions.push({
            versionId: crypto.randomUUID(),
            resumeData: targetVersion.resumeData,
            atsScore: targetVersion.atsScore,
            type: "restored",
            createdAt: new Date()
        });

        const updatedResume = await resume.save();

        res.status(200).json({ success: true, data: updatedResume });
    } catch (error) {
        console.error("Restore version error:", error);
        res.status(500).json({ message: "Error restoring version" });
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
                if (mode === 'regenerate') {
                    aiResult = await improveResumeRegenerateV2(storedResumeData, jobDescription || '', atsContext);
                } else {
                    aiResult = await improveResumeStructuredV2(storedResumeData, jobDescription || '', atsContext);
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
                            const refineResult = await improveResumeStructuredV2(
                                optimizedResumeData,
                                jobDescription,
                                {
                                    atsScore: newScoreData.atsScore,
                                    missingCriticalSkills: newScoreData.missingCriticalSkills || [],
                                    weakSections: newScoreData.weakSections || [],
                                    matchedSkills: newScoreData.matchedSkills || [],
                                }
                            );
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

                return res.status(200).json({
                    success: true,
                    optimizedResume,
                    optimizedResumeData,
                    improvementSummary,
                    newScore: newScoreData?.atsScore || null,
                    scoreDelta: newScoreData?.scoreDelta || null,
                    llmFallback: validationFallback,
                    newAnalysis: newScoreData,
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

        return res.status(200).json({
            success: true,
            optimizedResume: classicResume,
            optimizedResumeData: null,
            improvementSummary: classicSummary,
            newScore: newScoreData?.atsScore || null,
            scoreDelta: newScoreData?.scoreDelta || null,
            llmFallback: classicFallback || false,
            newAnalysis: newScoreData,
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
                res.write(`data: ${JSON.stringify(meta)}\n\n`);
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
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });
        if (!resume.originalFileKey) {
            return res.status(404).json({ message: "No original file stored for this resume" });
        }

        const command = new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: resume.originalFileKey,
        });
        const r2Response = await r2.send(command);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${resume.title || 'resume'}.pdf"`);
        if (r2Response.ContentLength) {
            res.setHeader('Content-Length', r2Response.ContentLength);
        }

        // Stream body directly to response
        r2Response.Body.pipe(res);
    } catch (error) {
        console.error("[R2] Stream error:", error.message);
        res.status(500).json({ message: "Error streaming resume file" });
    }
};

// --- Delete Resume (with R2 cleanup) ---
export const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;
        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // Delete original PDF from R2 if stored
        if (resume.originalFileKey) {
            try {
                await r2.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: resume.originalFileKey,
                }));
                console.log(`[R2] Deleted: ${resume.originalFileKey}`);
            } catch (r2Err) {
                // Log but continue — don't block DB deletion if R2 fails
                console.error(`[R2] Delete failed for key ${resume.originalFileKey}:`, r2Err.message);
            }
        }

        await Resume.deleteOne({ _id: id, user: req.user.id });
        res.status(200).json({ success: true, message: "Resume deleted" });
    } catch (error) {
        console.error("Delete resume error:", error);
        res.status(500).json({ message: "Error deleting resume" });
    }
};
