import Resume from "../models/resume.model.js";
import { calculateATSScore } from "../utils/atsEngine.js";
import { generateInterviewPrep, callCloudflareAIStreaming } from "../services/ai.service.js";

// --- ATS Analysis ---
export const analyzeResumeATS = async (req, res) => {
    try {
        const { id } = req.params;
        const { jobDescription, resumeContent: manualContent } = req.body;

        const resume = await Resume.findOne({ _id: id, user: req.user.id });
        if (!resume) return res.status(404).json({ message: "Resume not found" });

        // Fix: Extract actual text content from the resume object
        // The scorer expects a string, not the whole mongoose document
        // PRIORITIZE manualContent if sent (for real-time analysis before save)
        const resumeContent = manualContent || resume.versions?.[resume.currentVersionIndex]?.content || resume.originalContent || "";

        const analysisResults = calculateATSScore(resumeContent, jobDescription);

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

        let systemPrompt = "You are a Master Resume Writer & ATS Optimization Expert. Your goal is to rewrite the user's resume (provided below) to maximize their ATS Match Score for the target job while maintaining their original factual content.\n\nCRITICAL RULES:\n1. **HEADER IS MANDATORY**: You MUST start with the user's Name, Email, and Phone Number. Do NOT omit these. If you are rewriting the whole resume, these must be at the very top.\n2. **NO PLACEHOLDERS**: Do NOT use brackets like [Date], [Company], or [Your Name]. Use the ACTUAL, ORIGINAL data from the resume. If a date or company is missing, omit it or use 'Present'.\n3. **PRESERVE FACTS**: Do not invent companies, degrees, or job titles. You may only rephrase the bullet points to be more impactful.\n4. Output ONLY the improved resume text first.\n5. NO conversational filler. Start directly with the resume header.\n6. NO Markdown formatting (do NOT use **, __, #).\n7. Use standard plain-text headings (EDUCATION, EXPERIENCE, SKILLS, etc.).\n8. PRIORITY 1: SEAMLESSLY INTEGRATE MISSING KEYWORDS. Do not just list them; weave them into bullet points.\n9. The very last part of your response MUST BE a concise list of improvements made, prefixed ONLY by the exact delimiter: [CHANGES_DONE]";

        let userPrompt = `A user has provided their resume content. Rewrite it to drastically improve its ATS compatibility with the job description. \n\nIMPORTANT: \n- Ensure the Name, Email, and Phone are clearly listed at the top.\n- Rewrite the bullet points to be results-oriented (Action + Task + Result).\n- Include the missing keywords naturally.\n- DO NOT RETURN A GENERIC TEMPLATE. USE THE CONTENT BELOW. \n\nAfter the resume, add [CHANGES_DONE] followed by a short bulleted list of 3-5 key improvements you made:`;

        // ATS Keyword Injection
        const { jobDescription, atsAnalysis } = req.body;

        if (atsAnalysis && atsAnalysis.analysis) {
            // Use pre-calculated analysis from frontend if available
            const { missingKeywords, formattingIssues } = atsAnalysis.analysis;

            if (missingKeywords && missingKeywords.length > 0) {
                userPrompt += `\n\n📢 CRITICAL: The following keywords are MISSING and hurting the score. You MUST integrate them into the Experience/Skills sections: ${missingKeywords.join(', ')}.`;
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
                userPrompt += `\n\n📢 CRITICAL: The following keywords are MISSING. You MUST integrate them into the Experience/Skills sections: ${missingKeywords.join(', ')}.`;
            }
        }

        // TRUNCATE CONTENT to avoid Token Limit Exceeded errors (Llama 3 context window)
        // Keep approx 15k chars (~3700 tokens) to be safe
        const truncatedContent = content.length > 15000 ? content.substring(0, 15000) + "\n...[Truncated]..." : content;

        userPrompt += `\n\n${truncatedContent}`;

        console.log(`[Magic Improve] Sending request. Content length: ${content.length}, Truncated to: ${truncatedContent.length}`);

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
