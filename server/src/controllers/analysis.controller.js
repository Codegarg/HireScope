import { calculateATSScore } from "../services/atsScorer.js";
import { extractTextFromFile } from "../services/textExtractor.service.js";
import { generateSuggestions } from "../services/ai.service.js";
import Resume from "../models/resume.model.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../utils/r2Client.js";
import { parseResumeToStructured } from "../utils/structuredResumeParser.js";

export const analyzeResume = async (req, res) => {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jd?.[0];
    const jdTextInput = req.body.jdText;
    const previousScore =
      req.body.previousScore !== undefined ? Number(req.body.previousScore) : null;

    let resumeText = "";
    let jdText = "";

    // Resume file or Resume ID is mandatory
    if (!resumeFile && !req.body.resumeId) {
      return res.status(400).json({ message: "Resume file or resumeId is required" });
    }

    // Extract resume text
    if (resumeFile) {
      resumeText = await extractTextFromFile(resumeFile);
    } else if (req.body.resumeId) {
      // Fetch existing resume content
      const existing = await Resume.findById(req.body.resumeId);
      if (!existing) return res.status(404).json({ message: "Resume not found" });
      resumeText = existing.parsedText || existing.originalContent || "";
    }

    // JD can be text OR file
    if (jdTextInput && jdTextInput.trim() !== "") {
      jdText = jdTextInput;
    } else if (jdFile) {
      jdText = await extractTextFromFile(jdFile);
    } else {
      return res.status(400).json({ message: "Job Description text or file is required" });
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
      const timestamp = Date.now();

      // ── Upload original PDF to Cloudflare R2 (non-fatal) ─────────────────
      let originalFileKey = "";
      if (resumeFile) {
        try {
          originalFileKey = `resumes/${userId}-${timestamp}.pdf`;
          await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: originalFileKey,
            Body: resumeFile.buffer,
            ContentType: "application/pdf",
          }));
          console.log(`[R2] Uploaded: ${originalFileKey}`);
        } catch (r2Err) {
          console.error("[R2] Upload failed (non-fatal):", r2Err.message);
          originalFileKey = "";
        }
      } else if (req.body.resumeId) {
        // Carry over the existing PDF key so we don't lose the frontend PDF view
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
        parsedText: resumeText, // Raw extracted text
        atsScore: atsResult.atsScore || 0,
        suggestionsCount: aiSuggestions?.length || 0,
        originalFileKey,
        resumeData: parseResumeToStructured(resumeText), // Populating structured data
        versions: [{
          versionId: crypto.randomUUID(), // Generate a unique ID for this snapshot
          atsScore: atsResult.atsScore || 0,
          resumeData: parseResumeToStructured(resumeText),
          type: "original",
          createdAt: new Date()
        }]
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
        resumeText,
        jdText,
      },
    });
  } catch (error) {
    console.error("ATS Analysis Error:", error);
    return res.status(500).json({ message: "Error analyzing resume" });
  }
};
