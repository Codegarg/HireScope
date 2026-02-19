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

// Helper to extract email/links from text
const extractContactInfo = (text) => {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9_-]+/;
    const githubRegex = /github\.com\/[a-zA-Z0-9_-]+/;
    const urlRegex = /https?:\/\/[^\s]+/;

    return {
        email: text.match(emailRegex)?.[0] || "",
        phone: text.match(phoneRegex)?.[0] || "",
        linkedin: text.match(linkedinRegex)?.[0] || "",
        github: text.match(githubRegex)?.[0] || "",
        portfolio: text.match(urlRegex)?.[0] || "" // Rough approximation
    };
};

// Simple Section Parser
const parseSectionsFromText = (text) => {
    if (!text) return {};

    const sections = {
        experience: [],
        education: [],
        projects: [],
        skills: { technical: [] },
        summary: ""
    };

    const lines = text.split('\n');
    let currentSection = 'summary'; // Default to summary/header
    let buffer = [];

    // Keywords to identify sections
    const sectionKeywords = {
        experience: ['experience', 'work history', 'employment'],
        education: ['education', 'academic'],
        projects: ['projects', 'softwares'],
        skills: ['skills', 'technologies', 'technical proficiency']
    };

    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();

        // Check if line is a header
        let isHeader = false;
        // Simple heuristic: Line is short, no lowercase (or mostly caps), or matches exact keywords
        if (trimmed.length < 40 && /^[a-z\s]+$/.test(trimmed)) {
            for (const [key, keywords] of Object.entries(sectionKeywords)) {
                if (keywords.some(k => trimmed.includes(k))) {
                    // Save previous buffer
                    if (buffer.length > 0) {
                        if (currentSection === 'summary') sections.summary = buffer.join(' ');
                        else if (currentSection === 'skills') sections.skills.technical.push(...buffer.join(' ').split(/[,•|]/).map(s => s.trim()).filter(s => s.length > 2));
                        else if (Array.isArray(sections[currentSection])) sections[currentSection].push({ description: buffer.join(' ') });
                    }

                    currentSection = key;
                    buffer = [];
                    isHeader = true;
                    break;
                }
            }
        }

        if (!isHeader && trimmed.length > 0) {
            buffer.push(line.trim());
        }
    }

    // Flush last buffer
    if (buffer.length > 0) {
        if (currentSection === 'summary') sections.summary = buffer.join(' ');
        else if (currentSection === 'skills') sections.skills.technical.push(...buffer.join(' ').split(/[,•|]/).map(s => s.trim()).filter(s => s.length > 2));
        else if (Array.isArray(sections[currentSection])) sections[currentSection].push({ description: buffer.join(' ') });
    }

    return sections;
};

export const calculateATSScore = (resume, jobDescription) => {
    const findings = {
        missingKeywords: [],
        formattingIssues: [],
        strengths: []
    };

    if (!jobDescription) return { score: 0, analysis: findings };

    // ── 0. Normalize Resume Data (Structure vs Text) ─────────────────────────────
    // If structured fields are empty, try to parse from raw content
    let processedResume = { ...resume.toObject?.() || resume }; // Clone

    // Check if we need to fall back to text parsing
    const hasStructure = processedResume.experience?.length > 0 || processedResume.education?.length > 0;

    if (!hasStructure) {
        // Try to get content from versions or originalContent
        const rawText = processedResume.versions?.[processedResume.currentVersionIndex]?.content
            || processedResume.originalContent
            || processedResume.contact // Fallback field
            || "";

        if (rawText) {
            const parsedInfo = extractContactInfo(rawText);
            const parsedSections = parseSectionsFromText(rawText);

            processedResume.personalInfo = { ...processedResume.personalInfo, ...parsedInfo };
            processedResume.personalInfo.summary = parsedSections.summary;
            processedResume.experience = parsedSections.experience;
            processedResume.education = parsedSections.education;
            processedResume.projects = parsedSections.projects;
            processedResume.skills = parsedSections.skills;
        }
    }

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
        processedResume.personalInfo?.summary || '',
        ...(processedResume.experience?.map(e => `${e.position || ''} ${e.company || ''} ${e.description || ''}`) || []),
        ...(processedResume.projects?.map(p => `${p.title || ''} ${p.technologies?.join(' ') || ''} ${p.description || ''}`) || []),
        ...(processedResume.education?.map(e => `${e.degree || ''} ${e.school || ''}`) || []),
        ...(processedResume.skills?.technical || []),
        ...(processedResume.skills?.soft || [])
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

    if (!processedResume.personalInfo?.linkedin && !processedResume.personalInfo?.github && !processedResume.personalInfo?.portfolio) {
        // Not strictly mandatory, but good for tech roles
        findings.formattingIssues.push("No professional links (LinkedIn/GitHub) detected.");
        formattingScore -= 3;
    }

    // Contact Info Check
    if (!processedResume.personalInfo?.email || !processedResume.personalInfo?.phone) {
        findings.formattingIssues.push("Missing essential contact information.");
        formattingScore -= 5;
    }

    if (!processedResume.experience?.length) {
        findings.formattingIssues.push("No work experience section directed. ATS parsers prioritize experience.");
        formattingScore -= 10;
    }

    // Summary Length Check
    const summaryLen = processedResume.personalInfo?.summary?.length || 0;
    if (summaryLen === 0) {
        findings.formattingIssues.push("Missing professional summary.");
        formattingScore -= 5;
    } else if (summaryLen < 50) { // Lowered threshold for parsed text
        findings.formattingIssues.push("Professional summary is too short. Aim for 3-4 sentences.");
        formattingScore -= 2;
    }


    // ── 3. Section Completeness (Max 15) ─────────────────────────────────────────
    let completenessScore = 15;

    if (!processedResume.skills?.technical?.length) {
        findings.missingKeywords.push("No technical skills listed in the Skills section.");
        completenessScore -= 5;
    }

    if (!processedResume.projects?.length && !processedResume.experience?.length) {
        // If neither exist, it's a very weak resume
        findings.formattingIssues.push("Lack of practical experience (Projects/Work) content.");
        completenessScore -= 5;
    }

    if (!processedResume.education?.length) {
        // Some jobs don't require it, but ATS looks for it
        findings.formattingIssues.push("Education section is missing.");
        completenessScore -= 3;
    }


    // ── 4. Identify Strengths & Consolidate ──────────────────────────────────────
    if (matchRatio > 0.3) findings.strengths.push("Good match with job description keywords.");
    if (processedResume.experience?.length >= 2) findings.strengths.push("Solid work history detected.");
    if (processedResume.projects?.length >= 2) findings.strengths.push("Strong project portfolio.");
    if (processedResume.skills?.technical?.length > 5) findings.strengths.push("Diverse technical skillset.");

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