import express from "express";
import { saveResume, getUserResumes, getUserResumeById, rewriteSection, getInterviewPrep, addVersion, improveResume } from "../controllers/resume.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", saveResume);
router.get("/", getUserResumes);
router.get("/:id", getUserResumeById);
router.post("/rewrite", rewriteSection);
router.post("/interview-prep", getInterviewPrep);
router.post("/version", addVersion);
router.post("/improve", improveResume);

export default router;
