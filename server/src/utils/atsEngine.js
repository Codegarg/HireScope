/**
 * Advanced ATS Logic Engine (Upgraded)
 * Calculates score based on:
 * 1. Keyword Match & Density (60%) - Uses full-text search + stop-word filtering
 * 2. Structural Integrity (25%)
 * 3. Section Completeness (15%)
 */

// Common stop words to exclude from keyword analysis
const STOP_WORDS = new Set([
    "and", "the", "of", "in", "to", "a", "with", "for", "on", "as", "by", "an", "is", "at", "from", "or", "that", "which",
    "be", "are", "was", "were", "have", "has", "had", "do", "does", "did", "can", "could", "will", "would", "should",
    "responsible", "responsibility", "duties", "included", "working", "worked", "work", "team", "support", "help",
    "managed", "managing", "handled", "handling", "created", "creating", "using", "used", "utilized", "maintaining",
    "various", "strong", "excellent", "good", "proficient", "familiar", "knowledge", "understanding", "experience",
    "including", "ensure", "ensuring", "able", "ability", "skill", "skills", "etc", "role", "task", "tasks"
]);

export const calculateATSScore = (resume, jobDescription) => {
    const findings = {
        missingKeywords: [],
        formattingIssues: [],
        strengths: []
    };

    if (!jobDescription) return { score: 0, analysis: findings };

    // ── 1. Advanced Keyword Analysis ─────────────────────────────────────────────

    // A. Parse Job Description (JD)
    // Extract words, lower-case, remove punctuation
    const jdWords = jobDescription.toLowerCase().match(/\b[a-z]{2,}\b/g) || [];

    // Filter out stop words to find "significant" keywords
    const significantJdKeywords = jdWords.filter(w => !STOP_WORDS.has(w));

    // Get unique significant keywords and their frequency in JD (optional, for now just presence)
    const uniqueJdKeywords = [...new Set(significantJdKeywords)];


    // B. Build Resume Full-Text Search Block
    // Concatenate all text content to find keywords hidden in descriptions
    const resumeFullText = [
        resume.personalInfo?.summary || '',
        ...(resume.experience?.map(e => `${e.position} ${e.company} ${e.description}`) || []),
        ...(resume.projects?.map(p => `${p.title} ${p.technologies?.join(' ')} ${p.description}`) || []),
        ...(resume.education?.map(e => `${e.degree} ${e.school}`) || []),
        ...(resume.skills?.technical || []),
        ...(resume.skills?.soft || [])
    ].join(' ').toLowerCase();

    // C. Find Matches
    const matchedKeywords = uniqueJdKeywords.filter(keyword => {
        // Use word boundary regex to ensure "go" doesn't match "google"
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(resumeFullText);
    });

    const missingKeywords = uniqueJdKeywords.filter(k => !matchedKeywords.includes(k));

    // D. Keyword Score Calculation (Max 60)
    // We expect a reasonable match rate of significant words. 
    // Let's say matching 40% of unique significant JD words is a "perfect" 60/60 score for this section,
    // because JDs often contain fluff too.
    const matchRatio = uniqueJdKeywords.length > 0 ? (matchedKeywords.length / uniqueJdKeywords.length) : 0;

    // Tweaked formula: 
    // If you match > 50% of unique significant words, you get max points.
    // Otherwise, proportional.
    const keywordScore = Math.min((matchRatio / 0.5) * 60, 60);

    // Record top missing keywords (up to 5)
    findings.missingKeywords = missingKeywords.slice(0, 5);


    // ── 2. Structural & Formatting Check (Max 25) ────────────────────────────────
    let formattingScore = 25;

    if (!resume.personalInfo?.linkedin && !resume.personalInfo?.github && !resume.personalInfo?.portfolio) {
        // Not strictly mandatory, but good for tech roles
        findings.formattingIssues.push("No professional links (LinkedIn/GitHub) detected.");
        formattingScore -= 3;
    }

    // Contact Info Check
    if (!resume.personalInfo?.email || !resume.personalInfo?.phone) {
        findings.formattingIssues.push("Missing essential contact information.");
        formattingScore -= 5;
    }

    if (resume.experience?.length === 0) {
        findings.formattingIssues.push("No work experience section directed. ATS parsers prioritize experience.");
        formattingScore -= 10;
    }

    // Summary Length Check
    const summaryLen = resume.personalInfo?.summary?.length || 0;
    if (summaryLen === 0) {
        findings.formattingIssues.push("Missing professional summary.");
        formattingScore -= 5;
    } else if (summaryLen < 100) {
        findings.formattingIssues.push("Professional summary is too short. Aim for 3-4 sentences.");
        formattingScore -= 2;
    }


    // ── 3. Section Completeness (Max 15) ─────────────────────────────────────────
    let completenessScore = 15;

    if (!resume.skills?.technical?.length) {
        findings.missingKeywords.push("No technical skills listed in the Skills section.");
        completenessScore -= 5;
    }

    if (!resume.projects?.length && !resume.experience?.length) {
        // If neither exist, it's a very weak resume
        findings.formattingIssues.push("Lack of practical experience (Projects/Work) content.");
        completenessScore -= 5;
    }

    if (resume.education?.length === 0) {
        // Some jobs don't require it, but ATS looks for it
        findings.formattingIssues.push("Education section is missing.");
        completenessScore -= 3;
    }


    // ── 4. Identify Strengths & Consolidate ──────────────────────────────────────
    if (matchRatio > 0.3) findings.strengths.push("Good match with job description keywords.");
    if (resume.experience?.length >= 2) findings.strengths.push("Solid work history detected.");
    if (resume.projects?.length >= 2) findings.strengths.push("Strong project portfolio.");
    if (resume.skills?.technical?.length > 5) findings.strengths.push("Diverse technical skillset.");

    const totalScore = Math.min(Math.round(keywordScore + formattingScore + completenessScore), 100);

    return {
        score: totalScore,
        analysis: findings,
        matchRate: Math.round(matchRatio * 100), // Raw percentage of keywords matched
        breakdown: {
            keywordScore: Math.round(keywordScore),
            formattingScore: Math.round(formattingScore),
            completenessScore: Math.round(completenessScore)
        }
    };
};