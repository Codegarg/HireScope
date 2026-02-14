import express from "express";
import { 
    saveResume, 
    getUserResumes, 
    getUserResumeById, 
    updateResume, 
    analyzeResumeATS, // Newly Added
    rewriteSection, 
    getInterviewPrep, 
    improveResume 
} from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

// Core CRUD
router.post("/", saveResume);
router.get("/", getUserResumes);
router.get("/:id", getUserResumeById);
router.put("/:id", updateResume);

// ATS Scoring & Analysis (Stage 5)
router.post("/:id/analyze", analyzeResumeATS);

// AI Tools
router.post("/rewrite", rewriteSection);
router.post("/interview-prep", getInterviewPrep);
router.post("/improve", improveResume);

export default router;