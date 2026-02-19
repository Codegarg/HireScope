import express from "express";
import { getUserChats, getChatById, sendMessage, deleteChat } from "../controllers/chat.controller.js";
import { authMiddleware as protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getUserChats);
router.get("/:id", protect, getChatById);
router.post("/", protect, sendMessage);
router.delete("/:id", protect, deleteChat);

export default router;
