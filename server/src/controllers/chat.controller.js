import { callCloudflareAIStreaming } from "../services/ai.service.js";

export const handleChat = async (req, res) => {
    try {
        const { message, history, context } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // Set headers for SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Final refined prompt with guardrails for maximum efficiency
        const systemPrompt = {
            role: "system",
            content: `You are a high-speed, token-efficient career assistant.
            STRICT GUARDRAILS:
            - Only answer questions related to: Career advice, Resume, JD, Software Engineering, or Interview Prep.
            - If a question is UNRELATED, respond with EXACTLY: "I focus only on career and software engineering topics."
            STRICT CONSTRAINTS:
            - Respond in under 60 words.
            - Provide ONLY highly necessary advice.
            - Use BOLD text for key terms to improve readability.
            - Max 1-2 bullet points.
            - NO conversational filler. No intro/outro.
            - Context: Resume: ${context?.resumeText?.substring(0, 500)}, JD: ${context?.jdText?.substring(0, 500)}.`
        };

        // Construct message history: system prompt + last N messages from client + current message
        const messages = [
            systemPrompt,
            ...(history || []).slice(-10), // Take the last 10 messages for context
            { role: "user", content: message }
        ];

        await callCloudflareAIStreaming(messages, res);
    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ message: "Error in career assistant chat" });
    }
};
