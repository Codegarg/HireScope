import dotenv from "dotenv";
dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = "@cf/meta/llama-3-8b-instruct";

const callCloudflareAI = async (prompt, systemPrompt = "You are an expert career assistant and ATS specialist. Provide concise, professional, and actionable advice.") => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        console.warn("Cloudflare credentials missing.");
        return "AI service is currently unavailable. Please configure Cloudflare credentials.";
    }

    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt },
                    ],
                    max_tokens: 2048,
                }),
            }
        );

        const data = await response.json();
        return data.result?.response || "Failed to generate AI response.";
    } catch (error) {
        console.error("Cloudflare AI Error:", error);
        return "Error communicating with AI service.";
    }
};

/**
 * Enhanced streaming call for Cloudflare AI
 */
export const callCloudflareAIStreaming = async (messages, res, options = {}) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        res.write(`data: ${JSON.stringify({ error: "Cloudflare credentials missing" })}\n\n`);
        res.end();
        return;
    }

    const safelyWrite = (data) => {
        try {
            res.write(data);
        } catch (e) {
            console.error("Error writing to stream (client disconnected?):", e);
        }
    };

    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages,
                    stream: true,
                    max_tokens: options.max_tokens || 2048,
                    temperature: options.temperature || 0.6
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Cloudflare API Error:", response.status, errorText);
            safelyWrite(`data: ${JSON.stringify({ error: `AI Service Error: ${response.status} - ${errorText}` })}\n\n`);
            try { res.end(); } catch (e) { }
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Accumulate response for saving later
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6);
                    if (dataStr.trim() === '[DONE]') continue;
                    try {
                        const json = JSON.parse(dataStr);
                        if (json.response) {
                            fullResponse += json.response;
                        }
                    } catch (e) { }
                }
            }

            safelyWrite(chunk);
        }

        if (options.onComplete) {
            await options.onComplete(fullResponse);
        }

        try { res.end(); } catch (e) { }
    } catch (error) {
        console.error("Cloudflare Streaming Error:", error);
        safelyWrite(`data: ${JSON.stringify({ error: "Error in AI stream" })}\n\n`);
        try { res.end(); } catch (e) { }
    }
};

export const generateSuggestions = async (resumeText, jdText, atsResult) => {
    const prompt = `
    ATS Score: ${atsResult.atsScore}
    Matched: ${atsResult.matchedSkills.slice(0, 5).join(", ")}
    Missing: ${atsResult.missingSkills.slice(0, 5).join(", ")}

    Resume: ${resumeText.substring(0, 1500)}
    JD: ${jdText.substring(0, 1500)}

    Provide ONLY:
    - 2 Strengths (1 sentence each)
    - 2 Weaknesses (1 sentence each)
    - 3 Actionable Tips (pointers)
    
    STRICT BRIEF MODE: Use bullet points. No conversational text.
  `;
    return await callCloudflareAI(prompt, "You are an ATS parser. Provide only essential pointers. Max 100 words.");
};



export const rewriteResumeSection = async (sectionText, instructions) => {
    const prompt = `
    Task: Rewrite the following resume section.
    Original Content: "${sectionText}"
    Instructions: "${instructions}"

    Requirement: Maintain a professional tone, use strong action verbs, and ensure it is ATS-friendly.
    Output: Only the rewritten content.
    `;
    return await callCloudflareAI(prompt, "You are an expert resume writer.");
};

export const generateInterviewPrep = async (resumeText, companyName) => {
    const prompt = `
    Based on this resume: ${resumeText.substring(0, 2000)}
    And the target company: ${companyName}

    Generate 5 specific interview questions this candidate might face at ${companyName}, 
    including brief advice on how to answer each one based on their experience.
    `;
    return await callCloudflareAI(prompt, "You are an expert interview coach.");
};

export const improveResumeContent = async (resumeText) => {
    const prompt = `
    Task: Rewrite the following resume for maximum impact, professional tone, and ATS compatibility.
    
    Resume Content:
    "${resumeText}"
    
    Requirements:
    - Use strong action verbs (e.g., "Led", "Developed", "Optimized").
    - Highlight achievements with quantifiable metrics where possible.
    - Ensure a clean, structured, and professional layout in plain text.
    - Keep it ATS-friendly by using standard headings.
    
    Output: Only the improved resume content.
    `;
    return await callCloudflareAI(prompt, "You are a Master Resume Writer and ATS Strategist.");
};

/**
 * Generate a response for a multi-turn chat conversation
 * @param {string} userMessage - The latest user message
 * @param {Object} context - Context object { history: [], resumeId, jobDescription }
 */
export const generateChatResponse = async (userMessage, context = {}) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        return "AI service is currently unavailable.";
    }

    try {
        const history = context.history || [];
        const systemPrompt = `You are an expert Career Coach and Resume Strategist.
        
Context:
${context.jobDescription ? `Target Job Description: ${context.jobDescription.substring(0, 500)}...` : ''}

Your Goal: Provide actionable, encouraging, and specific advice. Keep responses concise (under 200 words) unless asked for detailed rewriting.
        `;

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ];

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages,
                    max_tokens: 1024,
                    temperature: 0.7, // Higher temp for more natural conversation
                }),
            }
        );

        const data = await response.json();
        return data.result?.response || "I'm having trouble thinking right now. Please try again.";
    } catch (error) {
        console.error("Chat Generation Error:", error);
        return "Error generating response.";
    }
};

export default {
    callCloudflareAI,
    callCloudflareAIStreaming
};
