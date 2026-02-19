import Resume from "../models/resume.model.js";
import { calculateATSScore } from "../utils/atsEngine.js";
import { generateInterviewPrep, callCloudflareAIStreaming } from "../services/ai.service.js";

// --- ATS Analysis ---
export const analyzeResumeATS = async (req, res) => {
    try {
        const { id } = req.params;
        const { jobDescription } = req.body;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        const analysisResults = calculateATSScore(resume, jobDescription);

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
    await callCloudflareAIStreaming(messages, res);
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

export const improveResume = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Resume content required" });
        }

        res.setHeader('Content-Type', 'text/event-stream');

        const messages = [
            {
                role: "system",
                content: "You are a Master Resume Writer and ATS Strategist. Rewrite resumes for maximum impact."
            },
            {
                role: "user",
                content: `Rewrite this resume for maximum impact, professional tone, and ATS compatibility. Use strong action verbs and quantifiable metrics:\n\n${content}`
            }
        ];

        await callCloudflareAIStreaming(messages, res);
    } catch (error) {
        console.error("Improvement error:", error);
        res.write(`data: ${JSON.stringify({ error: "Error improving resume" })}\n\n`);
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
