/**
 * HireScope — Rule-Based ATS Scoring Engine (8 Components)
 * Used by: resume.controller.js  →  analyzeResumeATS()
 *
 * Weights:
 *   Required Skills Match      30%
 *   Preferred Skills Match     15%
 *   Experience Relevance       15%
 *   Keyword Density            10%
 *   Section Completeness       10%
 *   Action Verb Strength        5%
 *   Formatting & Structure      5%
 *   Semantic Similarity        10%
 *
 * Total = 100
 */

import {
    TECH_SKILLS,
    SECTION_HEADERS,
    STRONG_ACTION_VERBS,
    WEAK_ACTION_VERBS,
    REQUIRED_SIGNAL_WORDS,
    PREFERRED_SIGNAL_WORDS,
} from "./skillDictionary.util.js";

// ── Stop Words ───────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
    "and", "the", "of", "in", "to", "a", "with", "for", "on", "as", "by", "an", "is", "at",
    "from", "or", "that", "which", "be", "are", "was", "were", "have", "has", "had", "do",
    "does", "did", "can", "could", "will", "would", "should", "may", "might", "must",
    "not", "but", "if", "we", "you", "they", "he", "she", "it", "this", "these", "those",
    "our", "your", "their", "its", "us", "me", "him", "her", "we", "who", "what", "how",
    "when", "where", "why", "also", "both", "each", "few", "more", "most", "other",
    "some", "such", "than", "then", "there", "these", "they", "very", "just", "into",
    "over", "after", "before", "during", "about", "between", "through", "while",
    "any", "all", "no", "nor", "so", "yet", "both", "either", "neither",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalize text: lowercase, remove punctuation but PRESERVE special tech chars (+, #, ., /, -) */
const normalize = (text = "") =>
    text.toLowerCase()
        .replace(/[^a-z0-9\s\+\#\-\.\/]/g, " ") // Added + and # to whitelist
        .replace(/\s+/g, " ")
        .trim();

/** Tokenize into meaningful words */
const tokenize = (text) =>
    normalize(text).split(" ").filter((w) => w.length > 1 && !STOP_WORDS.has(w));

/** Count occurrences of a keyword (boundary-aware, handles special chars like C++, C#, .NET) */
export const countOccurrences = (text, keyword) => {
    try {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Improved boundary: (start/whitespace/punct) keyword (end/whitespace/punct)
        // Uses lookbehind/lookahead for zero-width matching of boundaries
        const regex = new RegExp(`(?<=^|[\\s\\(\\)\\[\\]\\{\\},\\.\\/\\\\!?;:])(${escaped})(?=$|[\\s\\(\\)\\[\\]\\{\\},\\.\\/\\\\!?;:])`, "gi");
        return (text.match(regex) || []).length;
    } catch {
        return 0;
    }
};

/** Check if text contains a keyword */
export const containsKeyword = (text, keyword) => countOccurrences(text, keyword) > 0;

/** Extract contact info */
const extractContactInfo = (text) => ({
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i.test(text),
    phone: /(?:\+?\d{1,3}[\-.\s]?)?\(?\d{3}\)?[\-.\s]?\d{3}[\-.\s]?\d{4}/i.test(text),
    linkedin: /linkedin\.com\/(?:in\/|profile\/)?[a-zA-Z0-9%_-]+|linkedin\s+profile/i.test(text),
    github: /github\.com\/[a-zA-Z0-9%_-]+|github\s+profile/i.test(text),
});

/** Simple section splitter: returns { sectionName → text } */
const parseSections = (text) => {
    const result = { raw: text, summary: "", experience: "", education: "", projects: "", skills: "" };
    const lines = text.split(/\n/);
    let currentSection = "summary";

    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (!trimmed) continue;

        let matched = false;
        for (const [section, headers] of Object.entries(SECTION_HEADERS)) {
            if (headers.some((h) => trimmed === h || trimmed.startsWith(h + " ") || trimmed.startsWith(h + ":"))) {
                currentSection = section;
                matched = true;
                break;
            }
        }
        if (!matched) {
            result[currentSection] = (result[currentSection] || "") + " " + line;
        }
    }
    return result;
};

/** Build TF vector (term frequency map) */
const buildTFVector = (text) => {
    const tokens = tokenize(text);
    const freq = {};
    tokens.forEach((t) => { freq[t] = (freq[t] || 0) + 1; });
    const total = tokens.length || 1;
    Object.keys(freq).forEach((k) => { freq[k] /= total; });
    return freq;
};

/** Extract high-value role-specific keywords (non-technical skills) */
const extractImportantKeywords = (resumeText, jdText, jdSkills) => {
    const jdTokens = tokenize(jdText);
    const resumeLower = normalize(resumeText);
    const skillTerms = new Set(jdSkills.flatMap(s => s.toLowerCase().split(" ")));
    
    // Find unique tokens in JD that aren't technical skills or stop words
    const counts = {};
    jdTokens.forEach(t => {
        if (!skillTerms.has(t) && t.length > 3) {
            counts[t] = (counts[t] || 0) + 1;
        }
    });

    // Get tokens that appear multiple times or are distinctive
    const keywords = Object.entries(counts)
        .filter(([_, count]) => count >= 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([k]) => k);

    // Filter to keywords that actually exist in the resume
    return keywords.filter(k => containsKeyword(resumeLower, k));
};

/** Cosine similarity between two TF vectors */
const cosineSimilarity = (vecA, vecB) => {
    const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dot = 0, magA = 0, magB = 0;
    for (const k of allKeys) {
        const a = vecA[k] || 0;
        const b = vecB[k] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }
    if (!magA || !magB) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

/** Extract skills from a text block */
const extractSkillsFromText = (text) => {
    const lower = normalize(text);
    return TECH_SKILLS.filter((skill) => containsKeyword(lower, skill));
};

/** Detect skills near required/preferred signals in a window */
const detectSkillsNearSignals = (jdText, signalWords, windowSize = 120) => {
    const lower = jdText.toLowerCase();
    const skills = new Set();
    for (const signal of signalWords) {
        let pos = 0;
        while ((pos = lower.indexOf(signal, pos)) !== -1) {
            const window = lower.slice(Math.max(0, pos - 20), pos + windowSize);
            extractSkillsFromText(window).forEach((s) => skills.add(s));
            pos += signal.length;
        }
    }
    return [...skills];
};

/** Extract approximate years of experience from text */
export const extractExperienceYears = (text) => {
    const patterns = [
        /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+relevant)?\s+(?:professional\s+)?experience/i,
        /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/i,
        /minimum\s+(?:of\s+)?(\d+)\s*(?:years?|yrs?)/i,
        /at\s+least\s+(\d+)\s*(?:years?|yrs?)/i,
        /(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:industry|professional|work|hands-on)/i,
    ];
    for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return parseInt(m[2] ? Math.floor((parseInt(m[1]) + parseInt(m[2])) / 2) : m[1], 10);
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 1 — Required Skills Match (30 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreRequiredSkills = (resumeText, jdText, jdSkills) => {
    // Skills explicitly flagged as "required" in JD
    let required = detectSkillsNearSignals(jdText, REQUIRED_SIGNAL_WORDS, 150);

    // Fallback: use all JD skills if required signals produced nothing
    if (required.length === 0) required = jdSkills;

    if (required.length === 0) return { score: 25, matched: [], missing: [], required: [] };

    const resumeLower = normalize(resumeText);
    const matched = required.filter((s) => containsKeyword(resumeLower, s));
    const missing = required.filter((s) => !matched.includes(s));

    // Weighted: each missing required skill is a heavy penalty
    const matchRatio = matched.length / required.length;
    // Curve: matching 60%+ of required = full marks
    const rawScore = Math.min(matchRatio / 0.6, 1) * 30;

    return {
        score: Math.round(rawScore),
        matched,
        missing,
        required,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 2 — Preferred Skills Match (15 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scorePreferredSkills = (resumeText, jdText, jdSkills, requiredSkills) => {
    let preferred = detectSkillsNearSignals(jdText, PREFERRED_SIGNAL_WORDS, 150);

    // Remove already-classified required skills
    preferred = preferred.filter((s) => !requiredSkills.includes(s));

    // Fallback: remaining JD skills not in required
    if (preferred.length === 0) {
        preferred = jdSkills.filter((s) => !requiredSkills.includes(s));
    }

    if (preferred.length === 0) return { score: 10, matched: [], missing: [] };

    const resumeLower = normalize(resumeText);
    const matched = preferred.filter((s) => containsKeyword(resumeLower, s));
    const matchRatio = matched.length / preferred.length;
    const rawScore = Math.min(matchRatio / 0.5, 1) * 15;

    return {
        score: Math.round(rawScore),
        matched,
        missing: preferred.filter((s) => !matched.includes(s)),
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 3 — Experience Relevance (15 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreExperienceRelevance = (sections, jdText) => {
    const expText = sections.experience + " " + sections.projects + " " + sections.summary;
    if (!expText.trim()) return { score: 0, detail: "No experience section detected" };

    const jdTokens = new Set(tokenize(jdText));
    const expTokens = tokenize(expText);

    if (jdTokens.size === 0) return { score: 10, detail: "Vague JD" };

    // Token overlap ratio
    const overlapCount = expTokens.filter((t) => jdTokens.has(t)).length;
    const overlapRatio = overlapCount / Math.max(expTokens.length, 1);

    // Normalize: 15%+ overlap = full marks
    const rawScore = Math.min(overlapRatio / 0.15, 1) * 15;

    return {
        score: Math.round(rawScore),
        detail: `${Math.round(overlapRatio * 100)}% token overlap with JD`,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 4 — Keyword Density & Distribution (10 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreKeywordDensity = (resumeText, jdSkills, sections) => {
    if (jdSkills.length === 0) return { score: 7, detail: "No skills to evaluate density" };

    const resumeLower = normalize(resumeText);
    const sectionTexts = [sections.skills, sections.experience, sections.projects, sections.education, sections.summary];

    let stuffingPenalty = 0;
    let distributionBonus = 0;

    for (const skill of jdSkills) {
        const totalCount = countOccurrences(resumeLower, skill);

        // Penalize keyword stuffing (>5 occurrences is suspicious)
        if (totalCount > 5) stuffingPenalty += Math.min((totalCount - 5) * 0.4, 2);

        // Reward natural distribution (appears in multiple sections)
        const sectionsWithSkill = sectionTexts.filter((s) => containsKeyword(normalize(s || ""), skill)).length;
        if (sectionsWithSkill >= 2) distributionBonus += 0.5;
    }

    const rawScore = Math.max(0, 8 + distributionBonus - stuffingPenalty);
    return {
        score: Math.min(Math.round(rawScore), 10),
        detail: `Stuffing penalty: ${stuffingPenalty.toFixed(1)}, Distribution bonus: ${distributionBonus.toFixed(1)}`,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 5 — Section Completeness (10 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreSectionCompleteness = (sections, resumeText) => {
    const resumeLower = normalize(resumeText);
    const sectionChecks = [
        { name: "Skills", text: sections.skills, weight: 3 },
        { name: "Experience", text: sections.experience, weight: 3 },
        { name: "Education", text: sections.education, weight: 2 },
        { name: "Projects", text: sections.projects, weight: 2 },
    ];

    let score = 0;
    const present = [];
    const missing = [];

    for (const check of sectionChecks) {
        const hasSection =
            (check.text && check.text.trim().length > 20) ||
            SECTION_HEADERS[check.name.toLowerCase()]?.some((h) => containsKeyword(resumeLower, h));

        if (hasSection) {
            score += check.weight;
            present.push(check.name);
        } else {
            missing.push(check.name);
        }
    }

    return { score: Math.min(score, 10), present, missing };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 6 — Action Verb Strength (5 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreActionVerbs = (resumeText) => {
    const lower = resumeText.toLowerCase();
    let strongCount = 0;
    let weakCount = 0;

    STRONG_ACTION_VERBS.forEach((v) => { if (containsKeyword(lower, v)) strongCount++; });
    WEAK_ACTION_VERBS.forEach((v) => { if (lower.includes(v)) weakCount++; });

    const total = strongCount + weakCount;
    if (total === 0) return { score: 2, detail: "No action verbs detected", strongCount, weakCount };

    const strongRatio = strongCount / total;
    const rawScore = Math.min(strongRatio / 0.7, 1) * 5;

    return {
        score: Math.round(rawScore),
        detail: `${strongCount} strong verbs, ${weakCount} weak verbs (ratio: ${Math.round(strongRatio * 100)}%)`,
        strongCount,
        weakCount,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 7 — Formatting & Structure (5 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreFormatting = (resumeText, sections) => {
    let score = 5;
    const issues = [];
    const contact = extractContactInfo(resumeText);

    if (!contact.email) { score -= 2; issues.push("Missing email address"); }
    if (!contact.linkedin && !contact.github) { score -= 1; issues.push("No professional links (LinkedIn/GitHub)"); }

    const summaryText = sections.summary || "";
    if (summaryText.trim().length < 50) {
        score -= 1;
        issues.push("Missing or very short professional summary");
    }

    return { score: Math.max(score, 0), issues };
};

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENT 8 — Semantic Similarity (10 pts)
// ─────────────────────────────────────────────────────────────────────────────
const scoreSemanticSimilarity = (resumeText, jdText) => {
    const tfResume = buildTFVector(resumeText);
    const tfJD = buildTFVector(jdText);
    const similarity = cosineSimilarity(tfResume, tfJD);

    // Normalize: 0.25 cosine similarity maps to full score
    const rawScore = Math.min(similarity / 0.25, 1) * 10;

    return {
        score: Math.round(rawScore),
        similarity: Math.round(similarity * 100) / 100,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN EXPORT — ruleBasedATSScore
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Synchronous rule-based 8-component ATS scorer.
 * Accepts plain text strings for both resume and job description.
 *
 * Returns the standard result shape plus `ruleScore`.
 */
export const ruleBasedATSScore = (resumeText, jobDescription) => {
    if (!jobDescription || !resumeText?.trim()) {
        return {
            score: 0,
            ruleScore: 0,
            overallScore: 0,
            atsScore: 0,
            breakdown: {
                requiredSkills: 0, preferredSkills: 0, experienceMatch: 0,
                densityScore: 0, sectionScore: 0, actionVerbScore: 0,
                formattingScore: 0, semanticScore: 0,
            },
            missingCriticalSkills: [],
            weakSections: [],
            improvementSuggestions: ["Provide resume and job description to get a score."],
            matchedSkills: [],
            missingSkills: [],
            analysis: { missingKeywords: [], formattingIssues: [], strengths: [] },
        };
    }

    // ── 1. Parse sections ──────────────────────────────────────────────────────
    const sections = parseSections(resumeText);

    // ── 2. Extract all JD skills ───────────────────────────────────────────────
    const jdNorm = normalize(jobDescription);
    const jdSkills = TECH_SKILLS.filter((s) => containsKeyword(jdNorm, s));

    // ── 3. Run all 8 components ────────────────────────────────────────────────
    const req = scoreRequiredSkills(resumeText, jobDescription, jdSkills);
    const pref = scorePreferredSkills(resumeText, jobDescription, jdSkills, req.required);
    const exp = scoreExperienceRelevance(sections, jobDescription);
    const density = scoreKeywordDensity(resumeText, jdSkills, sections);
    const section = scoreSectionCompleteness(sections, resumeText);
    const verbs = scoreActionVerbs(resumeText);
    const fmt = scoreFormatting(resumeText, sections);
    const semantic = scoreSemanticSimilarity(resumeText, jobDescription);

    // ── 4. Compose ruleScore ───────────────────────────────────────────────────
    const ruleScore = Math.min(
        req.score + pref.score + exp.score + density.score +
        section.score + verbs.score + fmt.score + semantic.score,
        100
    );

    // ── 5. Build lists ─────────────────────────────────────────────────────────
    const matchedSkills = [...new Set([...req.matched, ...pref.matched])];
    const missingCriticalSkills = req.missing.slice(0, 8);
    const weakSections = section.missing;

    // ── 6. Build improvement suggestions ──────────────────────────────────────
    const suggestions = [];

    if (missingCriticalSkills.length > 0)
        suggestions.push(`Add missing required skills to your resume: ${missingCriticalSkills.slice(0, 5).join(", ")}.`);

    if (weakSections.length > 0)
        suggestions.push(`Add or expand these sections: ${weakSections.join(", ")}.`);

    if (verbs.weakCount > verbs.strongCount)
        suggestions.push(`Replace weak verbs (helped, worked on) with strong action verbs (led, built, optimized).`);

    if (fmt.issues.length > 0)
        fmt.issues.forEach((i) => suggestions.push(i));

    if (semantic.similarity < 0.1)
        suggestions.push("Your resume language is very different from the job description. Mirror JD terminology more closely.");

    if (density.score < 5)
        suggestions.push("Improve keyword distribution — mention key skills naturally across multiple sections.");

    if (exp.score < 7)
        suggestions.push("Strengthen your Experience section with more role-specific keywords from the job description.");

    // ── 7. Experience years ────────────────────────────────────────────────────
    const experienceYearsRequired = extractExperienceYears(jobDescription);
    const experienceYearsFound = extractExperienceYears(resumeText);

    // ── 8. Build legacy analysis shape (used by frontend) ─────────────────────
    const analysis = {
        missingKeywords: [...req.missing, ...pref.missing].slice(0, 8),
        formattingIssues: fmt.issues,
        strengths: [
            ...(matchedSkills.length > 3 ? [`Matched ${matchedSkills.length} relevant skills.`] : []),
            ...(verbs.strongCount > 3 ? ["Good use of action verbs."] : []),
            ...(section.present.length >= 3 ? ["Resume has most key sections."] : []),
            ...(semantic.similarity > 0.15 ? ["Strong language alignment with the JD."] : []),
        ],
    };

    return {
        // Scores
        score: ruleScore,
        ruleScore,
        overallScore: ruleScore, // will be overridden by hybrid combiner if used
        atsScore: ruleScore,     // will be overridden by hybrid combiner if used

        // Breakdown
        breakdown: {
            requiredSkills: req.score,
            preferredSkills: pref.score,
            experienceMatch: exp.score,
            densityScore: density.score,
            sectionScore: section.score,
            actionVerbScore: verbs.score,
            formattingScore: fmt.score,
            semanticScore: semantic.score,
        },

        // Lists
        matchedSkills,
        missingSkills: [...req.missing, ...pref.missing],
        missingCriticalSkills,
        weakSections,
        improvementSuggestions: suggestions,

        // Experience
        experienceYearsRequired,
        experienceYearsFound,
        yearsMismatch:
            experienceYearsRequired !== null &&
            experienceYearsFound !== null &&
            experienceYearsFound < experienceYearsRequired,

        // Legacy shape (for frontend compatibility)
        analysis,
        matchRate: Math.round((matchedSkills.length / Math.max(jdSkills.length, 1)) * 100),
        matchingKeywords: extractImportantKeywords(resumeText, jobDescription, jdSkills),
    };
};