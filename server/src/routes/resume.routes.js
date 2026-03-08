import express from "express";
import {
    saveResume,
    getUserResumes,
    getUserResumeById,
    updateResume,
    analyzeResumeATS,
    rewriteSection,
    getInterviewPrep,
    improveResume,
    improveResumeStreaming,
    downloadResumePDF,
    streamResumeFile,
    deleteResume,
    cloneResume,
    uploadResume,
    getResumeVersions,
    restoreResumeVersion,
    downloadVersionPDF,
    viewVersionPDF,
    commitVersion,
    uploadVersionPDF,
    extractResumeStructure
} from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Core CRUD
router.post("/", saveResume);
router.post("/upload", upload.single('resume'), uploadResume);
router.get("/", getUserResumes);
router.get("/:id", getUserResumeById);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);

// Versioning
router.get("/:id/versions", getResumeVersions);
router.post("/:id/restore/:versionNumber", restoreResumeVersion);
router.put("/:id/version/:versionNumber/pdf", upload.single('pdf'), uploadVersionPDF);
router.get("/:id/version/:versionNumber/download", downloadVersionPDF);
router.get("/:id/version/:versionNumber/view", viewVersionPDF);
router.post("/:id/commit/:versionNumber", commitVersion);

// Cloning
router.post("/:id/clone", cloneResume);

// ATS Scoring & Analysis
router.post("/:id/analyze", upload.single('jdFile'), analyzeResumeATS);

// AI Tools
router.post("/rewrite", rewriteSection);
router.post("/interview-prep", getInterviewPrep);
router.post("/:id/improve", improveResume);
router.post("/:id/improve-stream", improveResumeStreaming);
router.post("/:id/extract-structure", extractResumeStructure);

// PDF Download (generated from DB data)
router.get("/:id/download", downloadResumePDF);

// Stream Original PDF from R2
router.get("/:id/file", streamResumeFile);

// Delete Resume (removes from DB + R2)
router.delete("/:id", deleteResume);

export default router;