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