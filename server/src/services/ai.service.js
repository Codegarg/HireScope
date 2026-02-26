import dotenv from "dotenv";
dotenv.config();
import { SECTION_HEADERS } from "../utils/skillDictionary.util.js";

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

/**
 * Non-streaming call to Cloudflare AI
 */
export const callCloudflareAINonStreaming = async (systemPrompt, userPrompt) => {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.result.response;
    } catch (error) {
        console.error("Cloudflare Non-Streaming Error:", error.response?.data || error.message);
        throw error;
    }
};

/**
 * Strict Section Header Extraction
 */
export const extractSectionHeaders = (text) => {
    const lines = text.split('\n');
    const headersFound = [];
    const allKnownHeaders = Object.values(SECTION_HEADERS).flat();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase();

        // Exact match or matches known patterns from skillDictionary
        const isHeader = allKnownHeaders.some(h =>
            lower === h ||
            lower.startsWith(h + ":") ||
            lower.startsWith(h + " ") ||
            // Also detect bold headers commonly used in this app
            trimmed.startsWith('**') && trimmed.endsWith('**') && allKnownHeaders.includes(trimmed.replace(/\*/g, '').toLowerCase().trim())
        );

        if (isHeader) {
            headersFound.push(trimmed);
        }
    }
    return headersFound;
};

/**
 * STRUCTURED MODE: Surgical improvements via JSON
 */
export const improveResumeStructured = async (resumeText, jobDescription) => {
    const systemPrompt = `You are a resume optimization engine.

STRICT RULES:
- DO NOT change section names.
- DO NOT add new sections.
- DO NOT reorder sections.
- DO NOT fabricate experience.
- Only improve wording and alignment.
- Only enhance existing content.
- If adding keywords, insert them naturally.
- Output ONLY valid JSON.
- No markdown.
- No explanation.`;

    const userPrompt = `Given this resume and job description:

1. Rewrite weak bullet points.
2. Improve action verbs.
3. Add quantification if logically possible.
4. Suggest keyword insertions within existing sections only.
5. Improve summary for JD alignment.
6. Maintain truthfulness.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return EXACTLY this JSON:

{
  "bulletRewrites": [
    {
      "original": "...",
      "improved": "..."
    }
  ],
  "keywordInsertions": [
    {
      "section": "...",
      "text": "..."
    }
  ],
  "summaryRewrite": "...",
  "improvementSummary": "..."
}`;

    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    try {
        const jsonStr = aiResponse.replace(/```json|```/g, "").trim();
        const data = JSON.parse(jsonStr);

        const originalHeaders = extractSectionHeaders(resumeText);
        let optimizedResume = resumeText;

        // Apply bullet rewrites
        if (data.bulletRewrites) {
            data.bulletRewrites.forEach(rewrite => {
                if (rewrite.original && rewrite.improved && rewrite.original.length > 5) {
                    optimizedResume = optimizedResume.replace(rewrite.original, rewrite.improved);
                }
            });
        }

        // Apply keyword insertions
        if (data.keywordInsertions) {
            data.keywordInsertions.forEach(ins => {
                const sectionHeader = ins.section.toUpperCase();
                const sectionRegex = new RegExp(`(${sectionHeader})(?::|\\n)`, 'i');
                if (sectionRegex.test(optimizedResume)) {
                    optimizedResume = optimizedResume.replace(sectionRegex, `$1\n• ${ins.text}\n`);
                }
            });
        }

        // Apply summary rewrite
        if (data.summaryRewrite) {
            const summaryMatch = optimizedResume.match(/(SUMMARY|OBJECTIVE|PROFILE|EXPERIENCE|EDUCATION)(?::|\n)([\s\S]+?)(?=\n\n|\n[A-Z\s]{5,}|$)/i);
            if (summaryMatch) {
                // If it matched a section other than summary (failsafe), we need to be careful.
                // But generally summary is first.
                optimizedResume = optimizedResume.replace(summaryMatch[2], `\n${data.summaryRewrite}\n`);
            }
        }

        // VALIDATION LAYER: Ensure structural integrity
        const newHeaders = extractSectionHeaders(optimizedResume);

        if (newHeaders.length !== originalHeaders.length) {
            console.warn(`[Validation] Section count mismatch. Rejection. Orig: ${originalHeaders.length}, New: ${newHeaders.length}`);
            return { optimizedResume: resumeText, improvementSummary: "Structural validation failed: Missing or Added sections.", llmFallback: true };
        }

        const isStructureValid = originalHeaders.every((h, i) => h.toLowerCase() === newHeaders[i].toLowerCase());
        if (!isStructureValid) {
            console.warn(`[Validation] Section name mismatch. Rejection. Orig: ${originalHeaders}, New: ${newHeaders}`);
            return { optimizedResume: resumeText, improvementSummary: "Structural validation failed: Section names altered.", llmFallback: true };
        }

        return { optimizedResume, improvementSummary: data.improvementSummary, llmFallback: false };
    } catch (error) {
        console.error("Structured Mode Error:", error, aiResponse);
        throw new Error("AI output was invalid JSON. Please try again.");
    }
};

/**
 * REGENERATE MODE: Full rewrite via JSON
 */
export const improveResumeRegenerate = async (resumeText, jobDescription) => {
    const systemPrompt = `You are an expert technical resume writer.

RULES:
- Optimize resume fully for the given job description.
- Maintain professional formatting.
- Do NOT fabricate skills or experience.
- Do NOT invent years.
- Be strict and ATS-focused.
- Output ONLY valid JSON.
- No markdown.
- No explanation.`;

    const userPrompt = `Rewrite this resume completely optimized for the job description.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return EXACTLY:

{
  "optimizedResume": ""
}`;

    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    try {
        const jsonStr = aiResponse.replace(/```json|```/g, "").trim();
        const data = JSON.parse(jsonStr);
        return {
            optimizedResume: data.optimizedResume,
            improvementSummary: "Full resume regeneration for enhanced JD alignment and technical impact."
        };
    } catch (error) {
        console.error("Regenerate Mode Error:", error, aiResponse);
        throw new Error("AI failed to regenerate the resume properly.");
    }
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

/**
 * Llama 3 Strict ATS Evaluator
 * Returns a structured JSON evaluation of the resume vs JD.
 * This function is anti-hallucination by design:
 *  - temperature = 0 (deterministic)
 *  - JSON-only system prompt
 *  - Validates JSON before returning
 *  - Falls back to null on any failure
 *
 * @param {string} resumeText
 * @param {string} jdText
 * @param {Object} ruleResult - Result from rule-based engine (for context)
 * @returns {Promise<Object|null>}
 */
export const callLlamaEvaluator = async (resumeText, jdText, ruleResult = {}) => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        console.warn("[LlamaEvaluator] Cloudflare credentials missing — skipping LLM evaluation.");
        return null;
    }

    // Build concise context (keep within token budget)
    const resumeSnippet = resumeText.substring(0, 2500);
    const jdSnippet = jdText.substring(0, 1500);
    const missingSkills = (ruleResult.missingCriticalSkills || []).slice(0, 6).join(", ") || "none";
    const matchedSkills = (ruleResult.matchedSkills || []).slice(0, 6).join(", ") || "none";

    const systemPrompt = `You are a strict, impartial ATS (Applicant Tracking System) evaluator.
Output ONLY valid JSON. No markdown, no explanation, no extra text before or after.
Base your evaluation ONLY on the resume text provided. Do NOT infer, assume, or fabricate any skills, experience, or facts.
If information is absent from the resume, treat it as absent — never invent it.`;

    const userPrompt = `Evaluate this resume against the job description and return EXACTLY this JSON structure:

{
  "score": <integer 0-100>,
  "knockouts": [<string: hard disqualifier reason or empty array>],
  "risks": [<string: potential concern or empty array>],
  "roleAlignment": <integer 0-100>,
  "experienceYearsRequired": <integer or null>,
  "experienceYearsFound": <integer or null>,
  "yearsMismatch": <boolean>,
  "evaluationNotes": <string: max 1 sentence summary>
}

SCORING RULES (follow strictly):
- score 0-20: Resume is blank, unrelated, or completely missing required skills
- score 21-45: Partial match, major skills missing
- score 46-65: Moderate match, some key skills present
- score 66-80: Good match, most required skills present
- score 81-100: Excellent match, nearly all required skills present
- Deduct score for: fabricated-looking experience, no measurable achievements, experience gap
- Do NOT score above 80 if critical required skills are missing

KNOCKOUT RULES:
- Flag as knockout if: resume is blank, or completely wrong domain, or requires license/degree that is absent
- Do NOT flag as knockout for minor mismatches

ANTI-HALLUCINATION:
- Only reference skills/experience that appear verbatim in the resume text
- If unsure, use null or empty array

--- RULE-BASED CONTEXT (use as reference only) ---
Rule Score: ${ruleResult.ruleScore || "N/A"}
Matched Skills: ${matchedSkills}
Missing Critical Skills: ${missingSkills}

--- JOB DESCRIPTION ---
${jdSnippet}

--- RESUME ---
${resumeSnippet}`;

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
                        { role: "user", content: userPrompt },
                    ],
                    max_tokens: 512,
                    temperature: 0,  // Deterministic — no creativity
                }),
            }
        );

        if (!response.ok) {
            console.warn(`[LlamaEvaluator] Cloudflare API returned ${response.status}`);
            return null;
        }

        const data = await response.json();
        const rawText = data.result?.response || "";

        // Strip markdown code fences if present
        const cleaned = rawText
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();

        // Extract JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("[LlamaEvaluator] No JSON object found in response:", rawText.substring(0, 200));
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate expected shape
        if (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 100) {
            console.warn("[LlamaEvaluator] Invalid score in response:", parsed.score);
            return null;
        }

        // Sanitize arrays
        parsed.knockouts = Array.isArray(parsed.knockouts) ? parsed.knockouts.slice(0, 5) : [];
        parsed.risks = Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5) : [];
        parsed.roleAlignment = typeof parsed.roleAlignment === "number"
            ? Math.max(0, Math.min(100, parsed.roleAlignment))
            : Math.round(parsed.score * 0.9);

        return parsed;
    } catch (error) {
        console.error("[LlamaEvaluator] Error:", error.message);
        return null;
    }
};

export default {
    callCloudflareAI,
    callCloudflareAIStreaming
};
