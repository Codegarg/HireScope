import { generateChatResponse } from "../services/ai.service.js";

export const handleChat = async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const aiResponse = await generateChatResponse(message, context || {});

        return res.status(200).json({
            success: true,
            data: aiResponse
        });
    } catch (error) {
        console.error("Chat Error:", error);
        return res.status(500).json({ message: "Error in career assistant chat" });
    }
};
