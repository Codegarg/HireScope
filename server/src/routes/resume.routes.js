import express from "express";
import {
    saveResume,
    getUserResumes,
    getUserResumeById,
    updateResume,
    analyzeResumeATS,
    createResumeVersion,
    rewriteSection,
    getInterviewPrep,
    improveResume,
    downloadResumePDF
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

// ATS Scoring & Analysis
router.post("/:id/analyze", upload.single('jdFile'), analyzeResumeATS);

// AI Tools
router.post("/rewrite", rewriteSection);
router.post("/interview-prep", getInterviewPrep);
router.post("/improve", improveResume);

// PDF Download
router.get("/:id/download", downloadResumePDF);

export default router;