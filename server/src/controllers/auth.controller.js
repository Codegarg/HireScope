import User from '../models/user.model.js';
import { generateToken } from '../utils/jwt.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { ApiError } from '../middlewares/error.middleware.js';

export const signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            throw new ApiError(400, "All fields are required");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) throw new ApiError(400, "User already exists");

        const user = new User({ username, email, password });
        await user.save();

        const token = generateToken(user._id);

        // Response matches the keys expected by AuthContext (id, name, email)
        res.status(201).json({
            user: {
                id: user._id,
                name: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            throw new ApiError(401, "Invalid credentials");
        }

        const token = generateToken(user._id);

        // Consistent response structure ensures AuthContext.jsx triggers redirection
        res.status(200).json({
            user: {
                id: user._id,
                name: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No account with that email exists." });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        // Bypasses validation for missing fields in older user records
        await user.save({ validateModifiedOnly: true });

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error("Critical: EMAIL_USER or EMAIL_PASS missing in .env");
            return res.status(500).json({ message: "Server email configuration error." });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Ensure this matches your frontend routing
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: `HireScope <${process.env.EMAIL_USER}>`,
            subject: 'HireScope Password Reset Request',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #7c3aed;">Password Reset</h2>
                    <p>You requested a password reset for your HireScope account. Click the button below to proceed:</p>
                    <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                    <p style="margin-top: 20px; font-size: 0.8rem; color: #64748b;">This link is valid for 1 hour.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Reset link sent to your email." });
    } catch (error) {
        logger.error('AUTH', "Mail Error Details", { error: error.message });
        next(error);
    }
};

export const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: "Token invalid or expired." });

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await user.save({ validateModifiedOnly: true });

        res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Find user by ID, selecting password
        const user = await User.findById(req.user.id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Check if user has a password set (e.g. might be Google Auth only)
        if (!user.password) {
            throw new ApiError(400, "Password cannot be changed for this account type.");
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            throw new ApiError(400, "Incorrect current password");
        }

        // Update with new password
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { username } = req.body;
        const userId = req.user.id;

        if (!username || username.trim() === '') {
            throw new ApiError(400, "Username cannot be empty");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        user.username = username.trim();
        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.username,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAccount = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find and delete the user
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            throw new ApiError(404, "User not found");
        }

        res.status(200).json({ message: "Account deleted successfully" });
    } catch (error) {
        next(error);
    }
};
