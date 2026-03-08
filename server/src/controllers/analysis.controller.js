import { calculateATSScore } from "../services/atsScorer.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { generateSuggestions } from "../services/ai.service.js";
import Resume from "../models/resume.model.js";
import { uploadResume as uploadResumeToStorage, validateFileKey } from "../services/storage.service.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../middlewares/error.middleware.js";

export const analyzeResume = async (req, res, next) => {
  try {
    logger.analysis('New analysis request received', { userId: req.user?.id });
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jd?.[0];
    const jdTextInput = req.body.jdText;
    const previousScore =
      req.body.previousScore !== undefined ? Number(req.body.previousScore) : null;

    let resumeText = "";
    let jdText = "";

    // Resume file or Resume ID is mandatory
    if (!resumeFile && !req.body.resumeId) {
      throw new ApiError(400, "Resume file or resumeId is required");
    }

    // Extract resume text
    if (resumeFile) {
      resumeText = await extractTextFromFile(resumeFile);
    } else if (req.body.resumeId) {
      // Fetch existing resume content
      const existing = await Resume.findById(req.body.resumeId);
      if (!existing) throw new ApiError(404, "Resume not found");
      resumeText = existing.parsedText || existing.originalContent || "";
    }

    // JD can be text OR file
    if (jdTextInput && jdTextInput.trim() !== "") {
      jdText = jdTextInput;
    } else if (jdFile) {
      jdText = await extractTextFromFile(jdFile);
    } else {
      throw new ApiError(400, "Job Description text or file is required");
    }

    // ── Hybrid ATS scoring (rule-based + Llama 3) ──────────────────────────
    const atsResult = await calculateATSScore(resumeText, jdText, { previousScore });

    // ── AI narrative suggestions (non-fatal) ──────────────────────────────
    let aiSuggestions = [];
    try {
      aiSuggestions = await generateSuggestions(resumeText, jdText, atsResult);
    } catch (aiErr) {
      console.warn("[analyzeResume] AI suggestions skipped:", aiErr.message);
    }

    // ── Auto-save resume if user is logged in ─────────────────────────────
    let savedResumeId = null;

    if (req.user) {
      const userId = req.user.id;

      // Upload original file to storage if provided (non-fatal)
      let originalFileKey = "";
      if (resumeFile) {
        try {
          originalFileKey = await uploadResumeToStorage(
            userId,
            resumeFile.buffer,
            resumeFile.mimetype,
            resumeFile.originalname
          );
          // Validate the returned key before proceeding
          if (!validateFileKey(originalFileKey)) {
            console.error("[Storage] Storage service returned unexpected key format:", originalFileKey);
            originalFileKey = "";
          }
        } catch (uploadErr) {
          console.error("[Storage] Upload failed (non-fatal):", uploadErr.message);
          originalFileKey = "";
        }
      } else if (req.body.resumeId) {
        const existing = await Resume.findById(req.body.resumeId);
        if (existing) {
          originalFileKey = existing.originalFileKey || "";
        }
      }

      const newResume = new Resume({
        user: userId,
        title: (() => {
          const titleMatch = jdText.match(/(?:Job Title|Role|Position):\s*([^\n]+)/i);
          if (titleMatch?.[1]) return `Target: ${titleMatch[1].trim().substring(0, 40)}`;
          return `Analysis ${new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })} - ${jdText.substring(0, 15)}...`;
        })(),
        originalContent: resumeText,
        parsedText: resumeText,
        atsScore: atsResult.atsScore || 0,
        suggestionsCount: aiSuggestions?.length || 0,
        analysis: {
          matchedSkills: atsResult.matchedSkills || [],
          missingSkills: atsResult.missingSkills || [],
          missingCriticalSkills: atsResult.missingCriticalSkills || [],
          suggestions: atsResult.improvementSuggestions || []
        },
        originalFileKey,
        versions: [{
          versionNumber: 1,
          atsScore: atsResult.atsScore || 0,
          fileKey: originalFileKey,
          type: "original",
          createdAt: new Date()
        }],
        versionCounter: 1
      });
      const saved = await newResume.save();
      savedResumeId = saved._id;
      logger.analysis('Analysis saved successfully', { resumeId: savedResumeId, userId });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...atsResult,
        aiSuggestions,
        resumeId: savedResumeId,
        resumeText,
        jdText,
      },
    });
  } catch (error) {
    logger.error('ANALYSIS', "Analysis Error", { error: error.message, userId: req.user?.id });
    next(error);
  }
};
