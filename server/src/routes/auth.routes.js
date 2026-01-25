import express from "express";
import passport from "passport";
import { generateToken } from "../utils/jwt.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { signup, login } from "../controllers/auth.controller.js";

const router = express.Router();

// Local auth
router.post("/signup", signup);
router.post("/login", login);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.json({ message: "Google login successful", token });
  }
);

// GitHub OAuth
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.json({ message: "GitHub login successful", token });
  }
);

// Protected
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
