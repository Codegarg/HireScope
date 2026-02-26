import Resume from "../models/resume.model.js";
import { calculateATSScore as ruleBasedScore } from "../utils/atsEngine.js";
import { calculateATSScore as hybridScore } from "../services/atsScorer.js";
import { generateInterviewPrep, callCloudflareAIStreaming, improveResumeStructured, improveResumeRegenerate } from "../services/ai.service.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";

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
        const updatedResume = await Resume.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { $set: req.body },
            { new: true }
        );
        res.status(200).json({ success: true, data: updatedResume });
    } catch (error) {
        res.status(500).json({ message: "Error updating resume" });
    }
};

// --- Versioning ---
export const createResumeVersion = async (req, res) => {
    try {
        const { resumeId, content, feedback } = req.body;

        const resume = await Resume.findOne({ _id: resumeId, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        resume.versions.push({
            content,
            feedback: feedback || "Manual save",
            createdAt: new Date()
        });

        resume.currentVersionIndex = resume.versions.length - 1;
        await resume.save();

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        console.error("Version creation error:", error);
        res.status(500).json({ message: "Error creating version" });
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

// --- Magic Improve (Refactored for Structured & Regenerate modes) ---
export const improveResume = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, jobDescription, mode = 'structured' } = req.body;
        const previousScore = req.body.previousScore !== undefined ? Number(req.body.previousScore) : null;

        if (!content) return res.status(400).json({ message: "Resume content is required" });

        console.log(`[Magic Improve] Mode: ${mode}, ID: ${id}`);

        let aiResult;
        if (mode === 'regenerate') {
            aiResult = await improveResumeRegenerate(content, jobDescription || "");
        } else {
            // Default: structured
            aiResult = await improveResumeStructured(content, jobDescription || "");
        }

        const { optimizedResume, improvementSummary, llmFallback: validationFallback } = aiResult;

        // ── Auto-recalculate ATS score after Magic Improve ─────────────
        let newScoreData = null;
        if (optimizedResume && jobDescription) {
            try {
                // Use hybrid score for the most accurate post-AI result
                newScoreData = await hybridScore(optimizedResume, jobDescription, { previousScore });
            } catch (err) {
                console.error("Post-Improve ATS Scoring failed:", err);
            }
        }

        res.status(200).json({
            success: true,
            optimizedResume,
            improvementSummary,
            newScore: newScoreData?.atsScore || null,
            scoreDelta: newScoreData?.scoreDelta || null,
            llmFallback: validationFallback || newScoreData?.llmFallback || false,
            newAnalysis: newScoreData // Return full analysis for frontend update
        });

    } catch (error) {
        console.error("Magic Improve Error:", error);
        res.status(500).json({ message: error.message || "Error during AI improvement" });
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
