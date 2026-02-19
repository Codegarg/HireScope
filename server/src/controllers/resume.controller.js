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

        // Update the resume with the new score so it reflects in Dashboard
        if (analysisResults && typeof analysisResults.score === 'number') {
            resume.atsScore = analysisResults.score;
            // Also update suggestions count if we have findings
            if (analysisResults.analysis) {
                const issuesCount = (analysisResults.analysis.missingKeywords?.length || 0) +
                    (analysisResults.analysis.formattingIssues?.length || 0);
                resume.suggestionsCount = issuesCount;
            }
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

export const improveResume = async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Resume content required" });
        }

        res.setHeader('Content-Type', 'text/event-stream');

        let systemPrompt = "You are a Master Resume Writer. Your task is to rewrite the user's resume for maximum impact while STRICTLY maintaining its plain-text structure and ensuring it fits on A SINGLE A4 PAGE.\n\nCRITICAL RULES:\n1. Output ONLY the improved resume text first.\n2. NO conversational filler (e.g., 'Here is your resume').\n3. NO intro text.\n4. NO Markdown formatting (do NOT use **, __, #).\n5. Use standard plain-text headings (EDUCATION, EXPERIENCE, SKILLS, etc.).\n6. The very last part of your response MUST BE a concise list of improvements made, prefixed ONLY by the exact delimiter: [CHANGES_DONE]\n7. Ensure the total resume text is concise enough for one page.";

        let userPrompt = `Improve this resume for professional tone and ATS compatibility. Keep it concise for ONE PAGE. After the resume, add [CHANGES_DONE] followed by a short bulleted list of what you changed:`;

        // ATS Keyword Injection
        const { jobDescription, atsAnalysis } = req.body;

        if (atsAnalysis && atsAnalysis.analysis) {
            // Use pre-calculated analysis from frontend if available
            const { missingKeywords, formattingIssues } = atsAnalysis.analysis;

            if (missingKeywords && missingKeywords.length > 0) {
                userPrompt += `\n\nCRITICAL INSTRUCTION: The following ATS keywords are missing from the resume but required by the job. Seamlessly integrate them into the Experience or Skills sections where contextually appropriate: ${missingKeywords.join(', ')}.`;
            }

            if (formattingIssues && formattingIssues.length > 0) {
                userPrompt += `\n\nALSO FIX THESE FORMATTING ISSUES: ${formattingIssues.join(', ')}`;
            }
        } else if (jobDescription) {
            // Fallback: Simple keyword extraction if no full analysis provided
            const jdWords = jobDescription.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];
            const contentLower = content.toLowerCase();
            const missingKeywords = [...new Set(jdWords)].filter(w =>
                w.length > 3 && !contentLower.includes(w) && !['with', 'that', 'have', 'from', 'this', 'will', 'your', 'their'].includes(w)
            ).slice(0, 8); // Top 8 missing words

            if (missingKeywords.length > 0) {
                userPrompt += `\n\nCRITICAL INSTRUCTION: The following ATS keywords are missing from the resume but required by the job. Seamlessly integrate them into the Experience or Skills sections where contextually appropriate: ${missingKeywords.join(', ')}.`;
            }
        }

        userPrompt += `\n\n${content}`;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        await callCloudflareAIStreaming(messages, res, { temperature: 0.1 });
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
