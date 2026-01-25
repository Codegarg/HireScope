import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 THIS LINE IS CRITICAL
app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "HireScope backend running 🚀" });
});

export default app;
