import express from "express";
import {
    signup,
    login,
    forgotPassword,
    resetPassword,
    changePassword,
    deleteAccount,
    updateProfile
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const router = express.Router();

// --- Basic Auth ---
router.post("/signup", signup);
router.post("/login", login);

// --- NEW: Password Recovery ---
// Route to request a reset link via email
router.post("/forgot-password", forgotPassword);
// Route to submit the new password using the token from the email
router.post("/reset-password/:token", resetPassword);

// Route for logged-in users to change their password
router.post("/change-password", authMiddleware, changePassword);

// Route for logged-in users to update their profile (username)
router.post("/update-profile", authMiddleware, updateProfile);

// Route for logged-in users to delete their account
router.delete("/delete-account", authMiddleware, deleteAccount);

// --- Google OAuth ---
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
}));

router.get("/google/callback", passport.authenticate("google", {
    failureRedirect: "/login",
    session: false
}), (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/login?token=${token}`);
});

// --- GitHub OAuth ---
router.get("/github", passport.authenticate("github", {
    scope: ["user:email"],
    session: false
}));

router.get("/github/callback", passport.authenticate("github", {
    failureRedirect: "/login",
    session: false
}), (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    res.redirect(`${clientUrl}/login?token=${token}`);
});

// --- Protected Routes ---
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        // Return user with 'name' field for frontend compatibility
        res.json({
            user: {
                id: user._id,
                name: user.username,  // Map username to name
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user" });
    }
});

export default router;