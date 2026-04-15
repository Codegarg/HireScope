import Chat from "../models/Chat.js";
import { generateChatResponse } from "../services/ai.service.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../middlewares/error.middleware.js";

// List all chats for the user
export const getUserChats = async (req, res, next) => {
    try {
        const chats = await Chat.find({ user: req.user.id })
            .sort({ updatedAt: -1 })
            .select("title updatedAt context.resumeId");
        res.status(200).json({ success: true, data: chats });
    } catch (error) {
        next(error);
    }
};

// Get single chat details
export const getChatById = async (req, res, next) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, user: req.user.id });
        if (!chat) throw new ApiError(404, "Chat not found");
        res.status(200).json({ success: true, data: chat });
    } catch (error) {
        next(error);
    }
};

// Create new chat or append message to existing
export const sendMessage = async (req, res, next) => {
    try {
        const { message, chatId, context } = req.body;
        let chat;

        if (chatId) {
            chat = await Chat.findOne({ _id: chatId, user: req.user.id });
            if (!chat) throw new ApiError(404, "Chat not found");
        } else {
            chat = new Chat({
                user: req.user.id,
                context: context || {},
                messages: []
            });
        }

        // Add user message and save immediately to persist it
        chat.messages.push({ role: "user", content: message });
        await chat.save();

        // Prepare context for AI
        const history = chat.messages.slice(-6, -1).map(m => ({ role: m.role, content: m.content }));
        
        // Extract context details
        const resumeText = context?.resumeText || "";
        const jobDescription = context?.jobDescription || "";
        const atsScore = context?.atsScore || "";

        const systemPrompt = `You are an expert Career Coach and Resume Strategist.
        
        ${resumeText ? `USER RESUME CONTENT:\n${resumeText.substring(0, 2000)}\n(end of resume)\n` : ''}
        ${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription.substring(0, 1500)}\n(end of jd)\n` : ''}
        ${atsScore ? `ATS Match Score: ${atsScore}%` : ''}

        Your Goal: Provide actionable, encouraging, and specific advice based on the user's resume and target job. Keep responses concise (under 200 words). Use markdown for formatting (bold, lists).
        `;

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message }
        ];

        // Set headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send initial metadata (chatId) so frontend knows which chat this belongs to
        res.write(`data: ${JSON.stringify({ chatId: chat._id, type: 'start' })}\n\n`);

        // Import the streaming function dynamically or assume it's imported
        // We need to import callCloudflareAIStreaming from ai.service.js
        const { callCloudflareAIStreaming } = await import("../services/ai.service.js");

        await callCloudflareAIStreaming(messages, res, {
            onComplete: async (fullResponse) => {
                // Save AI response to DB
                chat.messages.push({ role: "assistant", content: fullResponse });

                // Update title if needed
                if (chat.messages.length === 2 && chat.title === "New Conversation") {
                    chat.title = message.substring(0, 30);
                }

                await chat.save();
            }
        });

    } catch (error) {
        logger.error('AI', "Chat Error", { error: error.message, chatId: req.body.chatId });
        if (!res.headersSent) {
            next(error);
        } else {
            res.write(`data: ${JSON.stringify({ error: "Server error during stream" })}\n\n`);
            res.end();
        }
    }
};

export const deleteChat = async (req, res, next) => {
    try {
        const deleted = await Chat.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!deleted) throw new ApiError(404, "Chat not found");
        res.status(200).json({ success: true, message: "Chat deleted" });
    } catch (error) {
        next(error);
    }
};
