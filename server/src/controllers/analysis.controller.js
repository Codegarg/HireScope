import { calculateATSScore } from "../services/atsScorer.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { generateSuggestions } from "../services/ai.service.js";
import Resume from "../models/resume.model.js";

export const analyzeResume = async (req, res) => {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jd?.[0];
    const jdTextInput = req.body.jdText;

    let resumeText = "";
    let jdText = "";

    // Resume file is mandatory
    if (!resumeFile) {
      return res.status(400).json({
        message: "Resume file is required"
      });
    }

    // Extract resume text
    resumeText = await extractTextFromFile(resumeFile);

    // JD can be text OR file
    if (jdTextInput && jdTextInput.trim() !== "") {
      jdText = jdTextInput;
    } else if (jdFile) {
      jdText = await extractTextFromFile(jdFile);
    } else {
      return res.status(400).json({
        message: "Job Description text or file is required"
      });
    }

    const atsResult = calculateATSScore(resumeText, jdText);

    // Generate AI suggestions — non-fatal: if AI is down, analysis still succeeds
    let aiSuggestions = [];
    try {
      aiSuggestions = await generateSuggestions(resumeText, jdText, atsResult);
    } catch (aiErr) {
      console.warn("[analyzeResume] AI suggestions skipped:", aiErr.message);
    }

    // Auto-save resume if user is logged in
    let savedResumeId = null;
    if (req.user) {
      const newResume = new Resume({
        user: req.user.id,
        title: (() => {
          // Attempt to extract job title
          const titleMatch = jdText.match(/(?:Job Title|Role|Position):\s*([^\n]+)/i);
          if (titleMatch && titleMatch[1]) {
            return `Target: ${titleMatch[1].trim().substring(0, 40)}`;
          }
          // Fallback to timestamped title
          return `Analysis ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${jdText.substring(0, 15)}...`;
        })(),
        originalContent: resumeText,
        atsScore: atsResult.atsScore || atsResult.score || 0,  // Save ATS score (handle both naming conventions)
        suggestionsCount: aiSuggestions?.length || 0,  // Save suggestions count
        versions: [{ content: resumeText, feedback: "Initial Analysis" }]
      });
      const saved = await newResume.save();
      savedResumeId = saved._id;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...atsResult,
        aiSuggestions,
        resumeId: savedResumeId,
        resumeText: resumeText, // Return full text for editor
        jdText: jdText
      }
    });
  } catch (error) {
    console.error("ATS Analysis Error:", error);
    return res.status(500).json({
      message: "Error analyzing resume"
    });
  }
};
