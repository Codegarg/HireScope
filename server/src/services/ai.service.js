import dotenv from "dotenv";
dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = "@cf/meta/llama-3-8b-instruct";

const callCloudflareAI = async (prompt) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        console.warn("Cloudflare credentials missing. Using placeholder response.");
        return "AI suggestions are currently unavailable. Please configure Cloudflare credentials in the .env file.";
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
                        { role: "system", content: "You are an expert career assistant and ATS specialist. Provide concise, professional, and actionable advice." },
                        { role: "user", content: prompt },
                    ],
                }),
            }
        );

        const data = await response.json();
        return data.result?.response || "Failed to generate AI response. Please check your Cloudflare configuration.";
    } catch (error) {
        console.error("Cloudflare AI Error:", error);
        return "Error communicating with AI service.";
    }
};

export const generateSuggestions = async (resumeText, jdText, atsResult) => {
    const prompt = `
    Analyze the following resume against the job description.
    ATS Score: ${atsResult.atsScore}
    Matched Skills: ${atsResult.matchedSkills.join(", ")}
    Missing Skills: ${atsResult.missingSkills.join(", ")}

    Resume: ${resumeText.substring(0, 2000)}
    JD: ${jdText.substring(0, 2000)}

    Please provide:
    1. Key Strengths
    2. Critical Weaknesses
    3. Actionable steps to improve the resume for this specific JD.
    Format the output as clear sections with bullet points.
  `;
    return await callCloudflareAI(prompt);
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
