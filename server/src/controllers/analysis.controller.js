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

    // ── Pre-Calculation Check: Deduplication / Reuse Logic ──────────────────
    let resumeDoc = null;
    let savedResumeId = null;

    if (req.user) {
      const userId = req.user.id;
      
      // Find existing resume for this user with same content
      resumeDoc = await Resume.findOne({ 
        user: userId, 
        $or: [
          { parsedText: resumeText },
          { originalContent: resumeText }
        ]
      }).sort({ updatedAt: -1 });

      if (resumeDoc) {
        savedResumeId = resumeDoc._id;
        // Check if this EXACT JD has already been analyzed for this resume
        const normalizedJd = jdText.trim().toLowerCase();
        const existingAnalysis = resumeDoc.analyses?.find(a => 
          a.jdText?.trim().toLowerCase() === normalizedJd
        );

        if (existingAnalysis) {
          logger.analysis('Repeat analysis detected - returning cached result', { resumeId: savedResumeId, userId });
          return res.status(200).json({
            success: true,
            cached: true,
            data: {
              atsScore: existingAnalysis.atsScore,
              matchedSkills: existingAnalysis.analysis?.matchedSkills || [],
              missingSkills: existingAnalysis.analysis?.missingSkills || [],
              missingCriticalSkills: existingAnalysis.analysis?.missingCriticalSkills || [],
              improvementSuggestions: existingAnalysis.analysis?.suggestions || [],
              aiSuggestions: existingAnalysis.aiSuggestions,
              resumeId: savedResumeId,
              resumeText,
              jdText,
            },
          });
        }
      }
    }

    // ── Hybrid ATS scoring (rule-based + AI) ──────────────────────────────────
    // Only happens if not already cached
    const atsResult = await calculateATSScore(resumeText, jdText, { previousScore });

    // ── AI narrative suggestions ──────────────────────────────────────────────
    let aiSuggestions = "";
    if (atsResult.narrativeFeedback) {
      const { strengths = [], weaknesses = [], tips = [] } = atsResult.narrativeFeedback;
      aiSuggestions = [
        "### Strengths",
        ...strengths.map(s => `- ${s}`),
        "",
        "### Improvements",
        ...weaknesses.map(w => `- ${w}`),
        "",
        "### Actionable Tips",
        ...tips.map((t, i) => `${i + 1}. ${t}`)
      ].join("\n");
    }

    // ── Auto-save results ─────────────────────────────────────────────────────
    if (req.user) {
      const userId = req.user.id;
      
      // Upload original file to storage if provided (non-fatal)
      let originalFileKey = "";
      if (resumeFile) {
        try {
          originalFileKey = await uploadResumeToStorage(userId, resumeFile.buffer, resumeFile.mimetype, resumeFile.originalname);
          if (!validateFileKey(originalFileKey)) originalFileKey = "";
        } catch (uploadErr) {
          console.error("[Storage] Upload failed:", uploadErr.message);
          originalFileKey = "";
        }
      } else if (req.body.resumeId) {
        const existing = resumeDoc || (await Resume.findById(req.body.resumeId));
        if (existing) originalFileKey = existing.originalFileKey || "";
      }

      const analysisEntry = {
        jdTitle: (() => {
          const titleMatch = jdText.match(/(?:Job Title|Role|Position):\s*([^\n]+)/i);
          return titleMatch?.[1]?.trim().substring(0, 50) || jdText.substring(0, 30);
        })(),
        jdText,
        atsScore: atsResult.atsScore || 0,
        analysis: {
          matchedSkills: atsResult.matchedSkills || [],
          missingSkills: atsResult.missingSkills || [],
          missingCriticalSkills: atsResult.missingCriticalSkills || [],
          suggestions: atsResult.improvementSuggestions || []
        },
        aiSuggestions,
        timestamp: new Date()
      };

      if (resumeDoc) {
        // Update existing record
        resumeDoc.atsScore = atsResult.atsScore || 0;
        resumeDoc.analysis = analysisEntry.analysis;
        resumeDoc.suggestionsCount = aiSuggestions?.length || 0;
        if (!resumeDoc.analyses) resumeDoc.analyses = [];
        resumeDoc.analyses.push(analysisEntry);
        await resumeDoc.save();
        logger.analysis('Analysis cached for existing resume', { resumeId: savedResumeId, userId });
      } else {
        // Create new record
        resumeDoc = new Resume({
          user: userId,
          title: resumeFile?.originalname?.replace(/\.[^/.]+$/, "") || `Resume ${new Date().toLocaleDateString()}`,
          originalContent: resumeText,
          parsedText: resumeText,
          atsScore: atsResult.atsScore || 0,
          suggestionsCount: aiSuggestions?.length || 0,
          analysis: analysisEntry.analysis,
          originalFileKey,
          versions: [{ versionNumber: 1, atsScore: atsResult.atsScore || 0, fileKey: originalFileKey, type: "original", createdAt: new Date() }],
          versionCounter: 1,
          analyses: [analysisEntry]
        });
        const saved = await resumeDoc.save();
        savedResumeId = saved._id;
        logger.analysis('New resume created and analyzed', { resumeId: savedResumeId, userId });
      }
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
