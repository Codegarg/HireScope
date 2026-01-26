import express from "express";
import multer from "multer";
import authMiddleware from "../middlewares/auth.middleware.js";
import { analyzeResume } from "../controllers/analysis.controller.js";

const router = express.Router();
const upload = multer();

// Accept:
// - resume (file)
// - jdFile (optional file)
// - jdText (optional text)
router.post(
  "/analyze",
  authMiddleware,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jdFile", maxCount: 1 },
  ]),
  analyzeResume
);

export default router;
