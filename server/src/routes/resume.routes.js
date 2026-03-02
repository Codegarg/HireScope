import express from "express";
import {
    saveResume,
    getUserResumes,
    getUserResumeById,
    updateResume,
    analyzeResumeATS,
    createResumeVersion,
    restoreVersion,
    rewriteSection,
    getInterviewPrep,
    improveResume,
    improveResumeStreaming,
    downloadResumePDF,
    streamResumeFile,
    deleteResume
} from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Core CRUD
router.post("/", saveResume);
router.get("/", getUserResumes);
router.get("/:id", getUserResumeById);
router.put("/:id", updateResume);

// Versioning
router.post("/version", createResumeVersion);
router.post("/:id/restore", restoreVersion);

// ATS Scoring & Analysis
router.post("/:id/analyze", upload.single('jdFile'), analyzeResumeATS);

// AI Tools
router.post("/rewrite", rewriteSection);
router.post("/interview-prep", getInterviewPrep);
router.post("/:id/improve", improveResume);
router.post("/:id/improve-stream", improveResumeStreaming);

// PDF Download (generated from DB data)
router.get("/:id/download", downloadResumePDF);

// Stream Original PDF from R2
router.get("/:id/file", streamResumeFile);

// Delete Resume (removes from DB + R2)
router.delete("/:id", deleteResume);

export default router;