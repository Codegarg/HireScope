import express from "express";
import cors from "cors";
import passport from "passport";

import connectDB from "./config/db.js";
import "./config/passport.js"; // strategies load themselves
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "HireScope backend running 🚀" });
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
