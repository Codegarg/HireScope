import 'dotenv/config';
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import resumeRoutes from "./routes/resume.routes.js";
import passport from "./config/passport.js";

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== "production";
  if (isDev || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept,Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

console.log(`✅ CORS ready | NODE_ENV="${process.env.NODE_ENV}" | isDev=${!process.env.NODE_ENV || process.env.NODE_ENV !== "production"}`);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(passport.initialize());

// Health check — used by Render to verify the service is alive
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/resumes", resumeRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server due to DB connection issue");
  process.exit(1);
});

// Handle graceful shutdown for Nodemon restarts
process.on('SIGUSR2', async () => {
  const { default: mongoose } = await import('mongoose');
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app restart');
  process.kill(process.pid, 'SIGUSR2');
});
