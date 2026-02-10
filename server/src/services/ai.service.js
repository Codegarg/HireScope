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
export const callCloudflareAIStreaming = async (messages, res) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        res.write(`data: ${JSON.stringify({ error: "Cloudflare credentials missing" })}\n\n`);
        res.end();
        return;
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
                    messages,
                    stream: true,
                    max_tokens: 512,
                }),
            }
        );

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Cloudflare streams data in event: message format usually
            res.write(chunk);
        }
        res.end();
    } catch (error) {
        console.error("Cloudflare Streaming Error:", error);
        res.write(`data: ${JSON.stringify({ error: "Error in AI stream" })}\n\n`);
        res.end();
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

export const generateChatResponse = async (userMessage, context) => {
    const prompt = `
    Context:
    Resume: ${context.resumeText?.substring(0, 1000)}
    JD: ${context.jdText?.substring(0, 1000)}
    ATS Score: ${context.atsResult?.atsScore}

    User Question: ${userMessage}

    Provide helpful career advice, interview preparation tips, or resume guidance based on the context provided.
  `;
    return await callCloudflareAI(prompt);
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
