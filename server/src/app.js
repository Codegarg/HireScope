import express from "express";
import cors from "cors";

const app = express();

/* ---------- Middlewares ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Health Check ---------- */
app.get("/", (req, res) => {
  res.json({ message: "Backend is running 🚀" });
});

export default app;
