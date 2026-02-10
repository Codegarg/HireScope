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

    // Generate AI suggestions
    const aiSuggestions = await generateSuggestions(resumeText, jdText, atsResult);

    // Auto-save resume if user is logged in
    let savedResumeId = null;
    if (req.user) {
      const newResume = new Resume({
        userId: req.user.id,
        title: `Resume for JD: ${jdText.substring(0, 30)}...`,
        originalContent: resumeText,
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
        resumeText: resumeText.substring(0, 5000), // Return snippet for frontend context
        jdText: jdText.substring(0, 5000)
      }
    });
  } catch (error) {
    console.error("ATS Analysis Error:", error);
    return res.status(500).json({
      message: "Error analyzing resume"
    });
  }
};
