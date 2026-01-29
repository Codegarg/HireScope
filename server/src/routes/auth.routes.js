import express from "express";
import { signup, login } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// Protected test route
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
