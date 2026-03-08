import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import passport from "./config/passport.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(passport.initialize());

// 🔥 THIS LINE IS CRITICAL
app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/resumes", resumeRoutes);

app.get("/", (req, res) => {
  res.json({ message: "HireScope backend running 🚀" });
});

// Global Error Handler — must be last
import { errorHandler } from "./middlewares/error.middleware.js";
app.use(errorHandler);

export default app;
