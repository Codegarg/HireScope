import { SECTION_HEADERS } from "../utils/skillDictionary.util.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../middlewares/error.middleware.js";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = "@cf/meta/llama-3-8b-instruct";

const callCloudflareAI = async (prompt, systemPrompt = "You are an expert career assistant and ATS specialist. Provide concise, professional, and actionable advice.") => {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        logger.error('AI', "Cloudflare credentials missing.");
        throw new ApiError(503, "AI service configuration missing");
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
        if (!data.result?.response) {
            throw new Error(data.errors?.[0]?.message || "Failed to generate AI response");
        }
        return data.result.response;
    } catch (error) {
        logger.error('AI', "Cloudflare AI Error", { error: error.message });
        throw error;
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
        logger.error('AI', 'Cloudflare credentials missing for non-streaming call');
        throw new ApiError(503, 'AI service configuration missing');
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
        if (!data.result?.response) {
            throw new Error(data.errors?.[0]?.message || 'Empty AI response');
        }
        return data.result.response;
    } catch (error) {
        logger.error('AI', 'Cloudflare Non-Streaming Error', { error: error.message });
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
 * Extract section headings and their order from a plain-text resume.
 * Returns an ordered list of section header lines found.
 */
const extractSectionOrder = (resumeText) => {
    const knownHeaders = [
        'summary', 'objective', 'profile', 'about',
        'skills', 'technical skills', 'core competencies',
        'experience', 'work experience', 'employment', 'work history',
        'projects', 'project experience',
        'education', 'academic background',
        'certifications', 'certificates', 'awards', 'achievements',
        'languages', 'interests', 'publications', 'volunteering'
    ];
    const lines = resumeText.split('\n');
    const sections = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length > 60) continue;
        const lower = trimmed.toLowerCase().replace(/[^a-z ]/g, '');
        if (knownHeaders.some(h => lower === h || lower.startsWith(h))) {
            sections.push(trimmed);
        }
    }
    return sections;
};

/**
 * Strip any preamble before the resume's actual start.
 * The resume starts at the candidate's name — we find the first line of the
 * original resume in the AI output and discard everything before it.
 */
const stripPreamble = (aiOutput, originalFirstLine) => {
    if (!originalFirstLine) return aiOutput.trim();
    const needle = originalFirstLine.trim().toLowerCase();
    const lines = aiOutput.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toLowerCase().includes(needle.substring(0, Math.min(needle.length, 20)))) {
            return lines.slice(i).join('\n').trim();
        }
    }
    // If we can't find the original first line, return as-is
    return aiOutput.trim();
};

/**
 * STRUCTURED MODE (OPTIMIZE): Surgical improvements — injects missing ATS keywords
 * into existing bullets only. Structure, headings, and order are NEVER touched.
 *
 * @param {string} resumeText
 * @param {string} jobDescription
 * @param {string[]} missingKeywords  — top missing critical skills from rule engine
 * @param {Object}  atsContext        — full ATS analysis: { matchedSkills, weakSections, breakdown, atsScore, missingCriticalSkills }
 */
export const improveResumeStructured = async (resumeText, jobDescription, missingKeywords = [], atsContext = {}) => {
    const { matchedSkills = [], weakSections = [], breakdown = {}, atsScore = null, missingCriticalSkills = [] } = atsContext;

    // Merge deduped missing keywords (rule engine + full ATS list)
    const allMissing = [...new Set([...missingCriticalSkills, ...missingKeywords])].slice(0, 15);
    const weakList = weakSections.length > 0 ? weakSections.join(', ') : 'none identified';

    // Extract the EXACT section order from the original resume to enforce it
    const sectionOrder = extractSectionOrder(resumeText);
    const originalFirstLine = resumeText.split('\n').find(l => l.trim().length > 0) || '';
    const sectionOrderBlock = sectionOrder.length > 0
        ? `MANDATORY SECTION ORDER — output sections in EXACTLY this order, with these EXACT headings:\n${sectionOrder.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}\n`
        : '';

    const systemPrompt = `You are a resume keyword injection engine. Your only task is to rewrite bullet points to add missing keywords.

CRITICAL OUTPUT FORMAT RULES — any violation is a complete failure:
1. Your output MUST start with the candidate's name on the first line — NO text before it.
2. Section headings MUST appear in the EXACT same order and with the EXACT same text as the original.
3. DO NOT add, remove, rename, or reorder any section.
4. DO NOT add new bullet points — rewrite existing ones only.
5. DO NOT copy or include ANY text from the job description (no JD titles, headings, or preamble).
6. DO NOT add preamble, notes, introductions, watermarks, or any non-resume text.
7. Preserve ALL dates, company names, school names, and job titles exactly as written.
8. Output ONLY the improved resume — nothing else before or after it.`;

    const keywordBlock = allMissing.length > 0
        ? `MISSING KEYWORDS TO INJECT (weave these naturally into existing bullets — skip if no fit):\n${allMissing.map(k => `  • ${k}`).join('\n')}\n`
        : 'No missing keywords — improve wording and action verbs only.\n';

    const userPrompt = `${sectionOrderBlock}\n${keywordBlock}
ATS CONTEXT:
- Current score: ${atsScore !== null ? atsScore : 'unknown'}/100
- Matched skills (already present — do not remove): ${matchedSkills.slice(0, 10).join(', ') || 'none'}
- Weak sections to focus on: ${weakList}

RULES:
- Only rewrite bullet point content — make them stronger with better action verbs and add the missing keywords naturally.
- Improve the summary paragraph if present — keep it the same paragraph, just better wording.
- Keep all original section headings in the SAME ORDER listed above.
- First line of output = candidate name. Nothing before it.

ORIGINAL RESUME (copy this structure exactly, only improve bullet wording):
${resumeText}

JOB DESCRIPTION (context only — do NOT reproduce any text from this in the output):
${jobDescription || 'Not provided.'}`;

    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    // Strip markdown fences
    let optimizedResume = aiResponse
        .replace(/```[\w]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

    // Strip any preamble — ensure output starts at the candidate name
    optimizedResume = stripPreamble(optimizedResume, originalFirstLine);

    if (!optimizedResume || optimizedResume.length < 100) {
        console.error('[Structured Mode] Response too short or empty');
        return { optimizedResume: resumeText, improvementSummary: 'AI output was empty. Your original resume has been preserved.', llmFallback: true };
    }

    const minAcceptableLength = Math.max(100, resumeText.length * 0.4);
    if (optimizedResume.length < minAcceptableLength) {
        console.warn(`[Structured Mode] Output too short (${optimizedResume.length} vs ${resumeText.length}). Falling back.`);
        return { optimizedResume: resumeText, improvementSummary: 'AI output was too short. Your original resume has been preserved.', llmFallback: true };
    }

    const injectedCount = allMissing.filter(kw => optimizedResume.toLowerCase().includes(kw.toLowerCase())).length;
    return {
        optimizedResume,
        improvementSummary: `Optimization applied: ${injectedCount} missing keyword(s) injected, bullet points strengthened. Structure and section order preserved exactly.`,
        llmFallback: false
    };
};

/**
 * REGENERATE MODE: ATS-driven rewrite — restructures ONLY if it will increase ATS score.
 * Uses full ATS context to target weak sections and inject missing skills intelligently.
 *
 * @param {string} resumeText
 * @param {string} jobDescription
 * @param {string[]} missingKeywords  — top missing critical skills from rule engine
 * @param {Object}  atsContext        — full ATS analysis: { matchedSkills, weakSections, breakdown, atsScore, missingCriticalSkills }
 */
export const improveResumeRegenerate = async (resumeText, jobDescription, missingKeywords = [], atsContext = {}) => {
    const { matchedSkills = [], weakSections = [], breakdown = {}, atsScore = null, missingCriticalSkills = [] } = atsContext;

    const allMissing = [...new Set([...missingCriticalSkills, ...missingKeywords])].slice(0, 20);
    const weakList = weakSections.length > 0 ? weakSections.join(', ') : 'none';

    // Build a breakdown hint so the AI knows where the score is bleeding
    const breakdownHint = Object.keys(breakdown).length > 0
        ? `Score breakdown — ${Object.entries(breakdown).map(([k, v]) => `${k}: ${v}`).join(', ')}`
        : '';

    const systemPrompt = `You are a senior ATS resume strategist and rewriter.
Mode: REGENERATE — you may rewrite bullet points, reorganize bullets within a section, and rename section headings ONLY if the rename will increase ATS keyword matching.

ABSOLUTE RULES — violating any of these is a failure:
1. DO NOT add new sections unless the resume is completely missing a clearly expected section type (e.g., has experience but no Skills section at all).
2. DO NOT add preamble, closing text, "Created by", watermarks, or the JD title.
3. DO NOT fabricate companies, roles, degrees, dates, or certifications not in the original.
4. DO NOT change date values — preserve all dates exactly.
5. Only rename a section heading if the new name is a standard resume heading AND increases ATS match.
6. Output ONLY the resume text — start immediately from the first line of the resume.`;

    const keywordBlock = allMissing.length > 0
        ? `MISSING KEYWORDS (integrate ALL of these that are relevant — this is your top priority):
${allMissing.map(k => `  • ${k}`).join('\n')}\n`
        : 'No specific missing keywords provided — focus on stronger verbs and impact.\n';

    const contextBlock = `ATS CONTEXT:
- Current ATS score: ${atsScore !== null ? atsScore : 'unknown'} / 100
- Already matched skills (keep these): ${matchedSkills.slice(0, 12).join(', ') || 'none'}
- Weakest sections (prioritize improving these the most): ${weakList}
${breakdownHint ? `- ${breakdownHint}` : ''}
`;

    const userPrompt = `${contextBlock}
${keywordBlock}
IMPROVEMENT RULES:
- Rewrite existing bullet points with stronger action verbs and quantifiable outcomes.
- Weave in ALL missing keywords naturally across the most relevant sections.
- Focus the heaviest rewriting on the WEAK SECTIONS listed above.
- You MAY merge or reorder bullets within a section if it improves flow and keyword density.
- You MAY rename section headings ONLY if the new name better matches standard ATS headings (e.g., "Work History" → "Work Experience"). Do not rename if already standard.
- Keep ALL existing sections — only add a new section if a critical one is entirely absent.
- Keep the professional summary tight and JD-aligned.

RESUME (rewrite and return this only):
${resumeText}

JOB DESCRIPTION (context only — do NOT copy its title or headings into the resume):
${jobDescription || 'Not provided — optimize for general professional impact.'}`;

    const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

    // Strip markdown fences the model might add
    let cleaned = aiResponse
        .replace(/```[\w]*\n?/gi, '')
        .replace(/```/g, '')
        .trim();

    // Strip preamble — ensure output starts at the candidate name
    const originalFirstLine = resumeText.split('\n').find(l => l.trim().length > 0) || '';
    cleaned = stripPreamble(cleaned, originalFirstLine);

    if (!cleaned || cleaned.length < 200) {
        console.error('[Regenerate Mode] Response too short or empty:', cleaned?.substring(0, 100));
        throw new Error('AI failed to regenerate the resume properly.');
    }

    const injectedCount = allMissing.filter(kw => cleaned.toLowerCase().includes(kw.toLowerCase())).length;
    return {
        optimizedResume: cleaned,
        improvementSummary: `Full ATS-targeted rewrite: ${injectedCount}/${allMissing.length} missing keyword(s) integrated, weak sections (${weakList}) strengthened.`
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
    const resumeSnippet = resumeText.substring(0, 1500); // Shortened to save tokens
    const jdSnippet = jdText.substring(0, 1000); // Shortened to save tokens
    const missingSkills = (ruleResult.missingCriticalSkills || []).slice(0, 6).join(", ") || "none";
    const matchedSkills = (ruleResult.matchedSkills || []).slice(0, 6).join(", ") || "none";

    const systemPrompt = `You are a strict, impartial ATS (Applicant Tracking System) evaluator.
Output ONLY valid JSON. No markdown, no explanation, no extra text. Use extremely short strings for knockouts and risks.
Base your evaluation ONLY on the resume text provided. Do NOT infer, assume, or fabricate any skills, experience, or facts.
If information is absent from the resume, treat it as absent — never invent it.`;

    const userPrompt = `Evaluate this resume against the job description and return EXACTLY this JSON structure:

{
  "score": <integer 0-100>,
  "knockouts": [<string: short knockout reason or empty array>],
  "risks": [<string: short risk or empty array>],
  "roleAlignment": <integer 0-100>,
  "experienceYearsRequired": <integer or null>,
  "experienceYearsFound": <integer or null>,
  "yearsMismatch": <boolean>,
  "evaluationNotes": <string: max 5 words>
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
                    max_tokens: 1024,
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

        let parsed = null;

        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (e) {
                // If it fails to parse, we will attempt regex fallback below
            }
        }

        if (!parsed) {
            // Truncation salvage logic
            const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/i);
            if (scoreMatch) {
                console.warn("[LlamaEvaluator] Truncated JSON response. Salvaging score from raw text.");
                parsed = {
                    score: parseInt(scoreMatch[1], 10),
                    knockouts: [],
                    risks: [],
                    roleAlignment: parseInt(scoreMatch[1], 10),
                    experienceYearsRequired: null,
                    experienceYearsFound: null,
                    yearsMismatch: false,
                    evaluationNotes: "Truncated evaluation"
                };
            } else {
                console.warn("[LlamaEvaluator] Failed to evaluate valid JSON. Raw text preview:", rawText.substring(0, 100));
                return null;
            }
        }

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

        // STRICT MODE ENFORCEMENT: Preserve exact array lengths and critical fields
        // 1. Experience
        if (Array.isArray(parsed.experience) && Array.isArray(resumeData.experience)) {
            // Force length to match original (slice or pad with original)
            parsed.experience = resumeData.experience.map((originalExp, i) => {
                const aiExp = parsed.experience[i] || {};
                return {
                    ...aiExp, // Take AI improvements (mostly descriptionPoints)
                    role: originalExp.role, // NEVER change role
                    organization: originalExp.organization, // NEVER change company
                    startDate: originalExp.startDate, // NEVER change dates
                    endDate: originalExp.endDate
                };
            });
        } else {
            parsed.experience = resumeData.experience; // Revert if LLM messed up structure completely
        }

        // 2. Education
        if (Array.isArray(parsed.education) && Array.isArray(resumeData.education)) {
            parsed.education = resumeData.education.map((originalEdu, i) => {
                const aiEdu = parsed.education[i] || {};
                return {
                    ...aiEdu,
                    degree: originalEdu.degree,
                    institution: originalEdu.institution,
                    startYear: originalEdu.startYear,
                    endYear: originalEdu.endYear
                };
            });
        } else {
            parsed.education = resumeData.education;
        }

        // 3. Projects
        if (Array.isArray(parsed.projects) && Array.isArray(resumeData.projects)) {
            parsed.projects = resumeData.projects.map((originalProj, i) => {
                const aiProj = parsed.projects[i] || {};
                return {
                    ...aiProj,
                    name: originalProj.name,
                    link: originalProj.link
                };
            });
        } else {
            parsed.projects = resumeData.projects;
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

/**
 * REGENERATE MODE V2 — Structural rewrite of resumeData JSON.
 * Allows reordering, heavy summary rewrites, and structural improvements.
 * Still forbids fabricating experience years/roles/dates.
 */
export const improveResumeRegenerateV2 = async (resumeData, jobDescription, atsContext = {}) => {
    const { atsScore, missingCriticalSkills = [], weakSections = [], matchedSkills = [] } = atsContext;

    const systemPrompt = `You are an elite Executive Resume Writer and ATS Architect. Your job is to fundamentally restructure and rewrite a resume to maximize impact and ATS score for a specific job description.

STRICT RULES:
- You MAY rewrite the professional summary completely.
- You MAY reorganize bullet points by impact.
- You MAY merge or heavily edit bullet points for better flow and keyword density.
- You MUST naturally integrate the requested missing skills.
- DO NOT add new jobs, companies, or degrees.
- DO NOT change the start/end dates of any experience.
- DO NOT fabricate tools, technologies, or certifications not present in the original.
- Return ONLY valid JSON matching the exact resumeData schema provided. No markdown. No explanation.`;

    const userPrompt = `Current ATS Score: ${atsScore ?? 'unknown'}
Matched Skills: ${matchedSkills.slice(0, 8).join(', ')}
Missing Critical Skills: ${missingCriticalSkills.slice(0, 8).join(', ')}
Weak Sections: ${weakSections.join(', ')}

Job Description:
${jobDescription?.substring(0, 1500) || 'Not provided'}

Resume Data (JSON):
${JSON.stringify(resumeData, null, 2).substring(0, 3000)}

Return the perfectly restructured resumeData as VALID JSON exactly matching this schema:
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
        const jsonStr = raw.replace(/```json|```/gi, '').trim();
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found in response');

        const parsed = JSON.parse(jsonStr.slice(start, end + 1));

        if (!parsed.personalInfo || !parsed.experience || !parsed.skills) {
            throw new Error('Parsed JSON missing required fields');
        }

        // Guardrails: Even in regenerate, never corrupt dates or core facts
        if (Array.isArray(parsed.experience) && Array.isArray(resumeData.experience)) {
            // Match up by company to preserve dates if order changed
            parsed.experience = parsed.experience.map(aiExp => {
                const originalExp = resumeData.experience.find(e =>
                    e.organization && aiExp.organization &&
                    e.organization.toLowerCase() === aiExp.organization.toLowerCase()
                ) || aiExp; // fallback to AI if not matched perfectly

                return {
                    ...aiExp,
                    startDate: originalExp.startDate || aiExp.startDate,
                    endDate: originalExp.endDate || aiExp.endDate
                };
            });
        }

        return {
            optimizedResumeData: parsed,
            optimizationSummary: 'Full structural regeneration applied. Summary rewritten and experience restructured for maximum impact.',
            llmFallback: false,
        };
    } catch (error) {
        console.error('[improveResumeRegenerateV2] Fallback triggered:', error.message);
        return {
            optimizedResumeData: resumeData,
            optimizationSummary: 'AI regeneration could not be parsed. Your original resume is preserved.',
            llmFallback: true,
        };
    }
};

export default {
    callCloudflareAI,
    callCloudflareAIStreaming
};
