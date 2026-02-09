import express from "express";
import { analyzeResume } from "../controllers/analysis.controller.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/analyze",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "jd", maxCount: 1 }
  ]),
  analyzeResume
);

export default router;
