import { extractText } from "../services/textExtractor.service.js";
import { extractSkills } from "../utils/skillExtractor.util.js";
import { calculateATS } from "../services/atsScorer.js";

export const analyzeResume = async (req, res) => {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jdFile?.[0];
    const jdText = req.body.jdText;

    if (!resumeFile) {
      return res
        .status(400)
        .json({ message: "Resume file is required" });
    }

    if (!jdFile && !jdText) {
      return res.status(400).json({
        message: "Job description file or text is required",
      });
    }

    // Extract texts
    const resumeText = await extractText(resumeFile);

    let finalJDText = jdText;
    if (jdFile) {
      finalJDText = await extractText(jdFile);
    }

    // Skill extraction
    const resumeSkills = extractSkills(resumeText);
    const jdSkills = extractSkills(finalJDText);

    // ATS calculation
    const result = calculateATS(resumeSkills, jdSkills);

    res.json({
      resumeSkills,
      jdSkills,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Resume analysis failed",
    });
  }
};
