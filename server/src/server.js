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

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

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
