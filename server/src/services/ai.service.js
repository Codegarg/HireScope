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
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error('Cloudflare credentials missing for non-streaming call');
    }
    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    max_tokens: 4096,
                }),
            }
        );
        const data = await response.json();
        if (!data.result?.response) throw new Error('Empty AI response');
        return data.result.response;
    } catch (error) {
        console.error('Cloudflare Non-Streaming Error:', error.message);
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
 * STRUCTURED MODE: Surgical improvements — returns improved plain text directly.
 * JSON was unreliable: bullet text has quotes/newlines Llama 3 never escapes correctly.
 */
export const improveResumeStructured = async (resumeText, jobDescription, missingKeywords = []) => {
    const systemPrompt = `You are a precise resume optimization engine.
Output ONLY the improved resume as plain text. No JSON. No markdown fences. No explanations. No preamble.`;

    const keywordHint = missingKeywords.length > 0
        ? `\nCRITICAL — These keywords are MISSING from the resume but required by the JD. You MUST naturally incorporate them into relevant existing sections:\n${missingKeywords.map(k => `  • ${k}`).join('\n')}\n`
        : '';

    const userPrompt = `Improve this resume surgically for the job description below.

STRICT RULES:
- DO NOT change, add, remove, or reorder section headings.
- DO NOT fabricate skills, companies, years, or experience.
- Only improve wording: stronger action verbs, better quantification, tighter phrasing.
- Naturally insert relevant keywords from the JD into existing sections only.
- Improve the summary/objective paragraph for JD alignment.
- Preserve ALL dates exactly as written.
- Return ONLY the improved resume text — nothing else.
${keywordHint}
RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription || 'Not provided — optimize for general professional impact.'}`;



    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    // Strip any accidental markdown fences
    const optimizedResume = aiResponse
        .replace(/```[\w]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

    if (!optimizedResume || optimizedResume.length < 100) {
        console.error('[Structured Mode] Response too short or empty');
        return { optimizedResume: resumeText, improvementSummary: 'AI output was empty. Your original resume has been preserved.', llmFallback: true };
    }

    // ── Sanity check: only reject if response is drastically too short ──────
    // Section-count checks were causing false fallbacks when the AI reformatted
    // a heading slightly. In plain-text mode the model isn't inventing sections;
    // just ensure the output is a substantial resume, not a truncated stub.
    const minAcceptableLength = Math.max(100, resumeText.length * 0.4);
    if (optimizedResume.length < minAcceptableLength) {
        console.warn(`[Structured Mode] Output too short (${optimizedResume.length} vs ${resumeText.length}). Falling back.`);
        return { optimizedResume: resumeText, improvementSummary: 'AI output was too short. Your original resume has been preserved.', llmFallback: true };
    }

    return {
        optimizedResume,
        improvementSummary: 'Surgical improvements applied: stronger verbs, better keyword alignment, and quantified achievements.',
        llmFallback: false
    };
};

/**
 * REGENERATE MODE: Full rewrite — returns plain text (no JSON wrapper)
 * Asking the LLM to embed a full resume inside a JSON string value is unreliable
 * because every newline/quote must be perfectly escaped. Plain text is far safer.
 */
export const improveResumeRegenerate = async (resumeText, jobDescription, missingKeywords = []) => {
    const systemPrompt = `You are an expert technical resume writer and ATS specialist.
Output ONLY the rewritten resume as plain text. No JSON. No markdown fences. No explanations. No preamble.`;

    const keywordHint = missingKeywords.length > 0
        ? `\nCRITICAL — These keywords are MISSING from the resume but required by the JD. You MUST naturally incorporate them:\n${missingKeywords.map(k => `  • ${k}`).join('\n')}\n`
        : '';

    const userPrompt = `Rewrite the resume below fully optimized for the job description.

RULES:
- Use strong action verbs and quantifiable achievements.
- Naturally integrate relevant keywords from the job description.
- Do NOT fabricate skills, companies, years, or experience.
- Maintain all original section headings.
- Return ONLY the rewritten resume text — nothing else.
${keywordHint}
RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription || 'Not provided — optimize for general professional impact.'}`;


    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    // Strip any accidental markdown fences the model might add
    const cleaned = aiResponse
        .replace(/```[\w]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

    if (!cleaned || cleaned.length < 200) {
        console.error('[Regenerate Mode] Response too short or empty:', cleaned?.substring(0, 100));
        throw new Error('AI failed to regenerate the resume properly.');
    }

    return {
        optimizedResume: cleaned,
        improvementSummary: 'Full resume regeneration for enhanced JD alignment and technical impact.'
    };
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
                    max_tokens: 800,
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

/**
 * STRUCTURED V2 MODE — ATS-targeted optimization of structured resumeData JSON.
 * Takes resumeData + ATS analysis context. Returns improved resumeData JSON.
 * Falls back to original resumeData with llmFallback: true if LLM fails.
 *
 * @param {Object} resumeData    — structured resume object
 * @param {string} jobDescription
 * @param {Object} atsContext    — { atsScore, breakdown, missingCriticalSkills, weakSections, matchedSkills }
 * @returns {Promise<{ optimizedResumeData, optimizationSummary, llmFallback }>}
 */
export const improveResumeStructuredV2 = async (resumeData, jobDescription, atsContext = {}) => {
    const { atsScore, missingCriticalSkills = [], weakSections = [], matchedSkills = [] } = atsContext;

    const systemPrompt = `You are an ATS optimization engine. Your job is to maximize the ATS score of a resume for a specific job description WITHOUT fabricating any skills, experience, or qualifications.

STRICT RULES:
- Strengthen existing bullet points with stronger action verbs and measurable outcomes.
- Surface implicitly present required skills that are already evident in the experience (but not explicitly stated).
- Improve keyword density naturally within existing context.
- Improve the summary to better align with the job description.
- DO NOT add new roles, companies, or years of experience.
- DO NOT invent tools, technologies, or certifications not present in the original.
- DO NOT reorder or remove sections.
- Preserve all dates exactly as given.
- Return ONLY valid JSON matching the exact resumeData schema provided. No markdown. No explanation.`;

    const userPrompt = `Current ATS Score: ${atsScore ?? 'unknown'}
Matched Skills: ${matchedSkills.slice(0, 8).join(', ')}
Missing Critical Skills: ${missingCriticalSkills.slice(0, 8).join(', ')}
Weak Sections: ${weakSections.join(', ')}

Job Description:
${jobDescription?.substring(0, 1500) || 'Not provided'}

Resume Data (JSON):
${JSON.stringify(resumeData, null, 2).substring(0, 3000)}

Return the improved resumeData as VALID JSON exactly matching this schema:
{
  "personalInfo": { "fullName":"","title":"","email":"","phone":"","linkedin":"","github":"" },
  "summary": "",
  "skills": { "languages":[],"core":[],"frontend":[],"backend":[],"databases":[],"cloud":[],"tools":[] },
  "projects": [{ "name":"","link":"","descriptionPoints":[] }],
  "experience": [{ "role":"","organization":"","startDate":"","endDate":"","points":[] }],
  "education": [{ "degree":"","institution":"","startYear":"","endYear":"" }]
}`;

    try {
        const raw = await callCloudflareAINonStreaming(systemPrompt, userPrompt);
        // Strip markdown fences if present
        const jsonStr = raw.replace(/```json|```/gi, '').trim();

        // Find first { and last } to extract JSON safely
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found in response');

        const parsed = JSON.parse(jsonStr.slice(start, end + 1));

        // Basic schema validation
        if (!parsed.personalInfo || !parsed.experience || !parsed.skills) {
            throw new Error('Parsed JSON missing required fields');
        }

        // Preserve original dates — never let LLM change them
        if (Array.isArray(parsed.experience) && Array.isArray(resumeData.experience)) {
            parsed.experience = parsed.experience.map((exp, i) => ({
                ...exp,
                startDate: resumeData.experience[i]?.startDate ?? exp.startDate,
                endDate: resumeData.experience[i]?.endDate ?? exp.endDate,
                organization: resumeData.experience[i]?.organization ?? exp.organization,
            }));
        }

        return {
            optimizedResumeData: parsed,
            optimizationSummary: `ATS optimization applied. Missing skills addressed: ${missingCriticalSkills.slice(0, 5).join(', ')}.`,
            llmFallback: false,
        };
    } catch (error) {
        console.error('[improveResumeStructuredV2] Fallback triggered:', error.message);
        return {
            optimizedResumeData: resumeData,
            optimizationSummary: 'AI optimization could not be parsed. Your original resume is preserved.',
            llmFallback: true,
        };
    }
};

export default {
    callCloudflareAI,
    callCloudflareAIStreaming
};
