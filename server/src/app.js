import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 THIS LINE IS CRITICAL
app.use("/auth", authRoutes);
app.use("/analysis", analysisRoutes);
app.use("/chat", chatRoutes);

app.get("/", (req, res) => {
  res.json({ message: "HireScope backend running 🚀" });
});

export default app;
