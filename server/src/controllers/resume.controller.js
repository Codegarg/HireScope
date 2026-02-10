import Resume from "../models/resume.model.js";
import { rewriteResumeSection, generateInterviewPrep, improveResumeContent } from "../services/ai.service.js";

export const saveResume = async (req, res) => {
    try {
        const { title, originalContent } = req.body;
        const userId = req.user.id;

        const resume = new Resume({
            userId,
            title,
            originalContent,
            versions: [{ content: originalContent, feedback: "Original Version" }]
        });

        await resume.save();
        res.status(201).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ message: "Error saving resume" });
    }
};

export const getUserResumes = async (req, res) => {
    try {
        const resumes = await Resume.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: resumes });
    } catch (error) {
        res.status(500).json({ message: "Error fetching resumes" });
    }
};

export const rewriteSection = async (req, res) => {
    try {
        const { sectionText, instructions, resumeId } = req.body;

        const rewrittenContent = await rewriteResumeSection(sectionText, instructions);

        // If resumeId provided, we can optionally auto-save it as a new version
        // For now, just return the AI output literal
        res.status(200).json({ success: true, data: rewrittenContent });
    } catch (error) {
        res.status(500).json({ message: "Error rewriting section" });
    }
};

export const getInterviewPrep = async (req, res) => {
    try {
        const { resumeText, companyName } = req.body;
        const prep = await generateInterviewPrep(resumeText, companyName);
        res.status(200).json({ success: true, data: prep });
    } catch (error) {
        res.status(500).json({ message: "Error generating interview prep" });
    }
};

export const addVersion = async (req, res) => {
    try {
        const { resumeId, content, feedback } = req.body;
        const resume = await Resume.findById(resumeId);

        if (!resume) return res.status(404).json({ message: "Resume not found" });

        resume.versions.push({ content, feedback });
        resume.currentVersionIndex = resume.versions.length - 1;
        await resume.save();

        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ message: "Error adding version" });
    }
};
export const getUserResumeById = async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });
        res.status(200).json({ success: true, data: resume });
    } catch (error) {
        res.status(500).json({ message: "Error fetching resume" });
    }
};

export const improveResume = async (req, res) => {
    try {
        const { resumeId, content } = req.body;
        const improvedContent = await improveResumeContent(content);

        res.status(200).json({ success: true, data: improvedContent });
    } catch (error) {
        res.status(500).json({ message: "Error improving resume" });
    }
};
