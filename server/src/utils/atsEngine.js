/**
 * Advanced ATS Logic Engine
 * Calculates score based on:
 * 1. Keyword Match (50%)
 * 2. Structural Integrity (30%)
 * 3. Section Completeness (20%)
 */
export const calculateATSScore = (resume, jobDescription) => {
    const findings = {
        missingKeywords: [],
        formattingIssues: [],
        strengths: []
    };

    if (!jobDescription) return { score: 0, analysis: findings };

    // 1. Keyword Analysis (Skills & Projects)
    const jdWords = jobDescription.toLowerCase().match(/\b(\w+)\b/g) || [];
    const resumeSkills = [
        ...(resume.skills?.technical || []),
        ...(resume.skills?.soft || []),
        ...(resume.projects?.flatMap(p => p.technologies) || [])
    ].map(s => s.toLowerCase());

    // Extract unique significant words from JD (length > 3)
    const uniqueJdSkills = [...new Set(jdWords)].filter(word => word.length > 3);
    const matchedKeywords = resumeSkills.filter(skill => jdWords.includes(skill));
    
    // Keyword Score (Max 50)
    const keywordScore = uniqueJdSkills.length > 0 
        ? Math.min((matchedKeywords.length / Math.min(uniqueJdSkills.length, 15)) * 50, 50) 
        : 25;

    // 2. Structural & Formatting Check (Max 30)
    let formattingScore = 30;
    if (!resume.personalInfo?.linkedin) {
        findings.formattingIssues.push("Missing LinkedIn profile link.");
        formattingScore -= 5;
    }
    if (resume.experience?.length === 0) {
        findings.formattingIssues.push("No work experience detected. Parsers prioritize chronological history.");
        formattingScore -= 10;
    }
    if (!resume.personalInfo?.summary || resume.personalInfo.summary.length < 50) {
        findings.formattingIssues.push("Professional summary is too short or missing.");
        formattingScore -= 5;
    }

    // 3. Section Completeness (Max 20)
    let completenessScore = 20;
    if (!resume.certifications?.length) {
        findings.missingKeywords.push("No certifications listed.");
        completenessScore -= 5;
    }
    if (!resume.projects?.length) {
        findings.formattingIssues.push("Project section is empty.");
        completenessScore -= 10;
    }

    // 4. Identify Strengths
    if (matchedKeywords.length > 10) findings.strengths.push("High technical keyword density.");
    if (resume.education?.length > 0) findings.strengths.push("Strong educational background.");

    const totalScore = Math.min(Math.round(keywordScore + formattingScore + completenessScore), 100);

    return {
        score: totalScore,
        analysis: findings,
        matchRate: Math.round((matchedKeywords.length / Math.max(uniqueJdSkills.length, 1)) * 100)
    };
};