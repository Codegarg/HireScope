import express from "express";
import passport from "passport";
import { signup, login } from "../controllers/auth.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { generateToken } from "../utils/jwt.js";

const router = express.Router();

/* ================================
   LOCAL AUTH
================================ */
router.post("/signup", signup);
router.post("/login", login);

/* ================================
   GOOGLE OAUTH (only if enabled)
================================ */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["email", "profile"] })
  );

  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
      const token = generateToken(req.user._id);
      res.json({
        message: "Google login successful",
        token,
      });
    }
  );
}

/* ================================
   GITHUB OAUTH (only if enabled)
================================ */
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  router.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );

  router.get(
    "/github/callback",
    passport.authenticate("github", { session: false }),
    (req, res) => {
      const token = generateToken(req.user._id);
      res.json({
        message: "GitHub login successful",
        token,
      });
    }
  );
}

/* ================================
   PROTECTED ROUTE
================================ */
router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
