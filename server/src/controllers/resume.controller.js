import Resume from "../models/resume.model.js";
import { rewriteResumeSection, generateInterviewPrep, improveResumeContent, callCloudflareAIStreaming } from "../services/ai.service.js";

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
        const { sectionText, instructions } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const messages = [
            { role: "system", content: "You are an expert resume writer." },
            { role: "user", content: `Task: Rewrite the following resume section.\nOriginal Content: "${sectionText}"\nInstructions: "${instructions}"\nRequirement: Maintain a professional tone, use strong action verbs, and ensure it is ATS-friendly.\nOutput: Only the rewritten content.` }
        ];

        await callCloudflareAIStreaming(messages, res);
    } catch (error) {
        console.error("Rewrite error:", error);
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
        const { content } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const messages = [
            { role: "system", content: "You are a Master Resume Writer and ATS Strategist." },
            { role: "user", content: `Task: Rewrite the following resume for maximum impact, professional tone, and ATS compatibility.\n\nResume Content:\n"${content}"\n\nRequirements:\n- Use strong action verbs (e.g., "Led", "Developed", "Optimized").\n- Highlight achievements with quantifiable metrics where possible.\n- Ensure a clean, structured, and professional layout in plain text.\n- Keep it ATS-friendly by using standard headings.\n\nOutput: Only the improved resume content.` }
        ];

        await callCloudflareAIStreaming(messages, res);
    } catch (error) {
        console.error("Improvement error:", error);
        res.status(500).json({ message: "Error improving resume" });
    }
};
