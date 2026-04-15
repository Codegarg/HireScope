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

// Manual CORS middleware — bypasses the cors package entirely
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // In dev (no NODE_ENV or NODE_ENV !== production), allow any localhost
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== "production";
  if (isDev || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

console.log(`✅ CORS: NODE_ENV="${process.env.NODE_ENV}" | CLIENT_URL="${process.env.CLIENT_URL}"`);

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
