/**
 * structuredResumeParser.js
 *
 * Converts raw extracted resume text (parsedText) into a structured resumeData JSON.
 * Pure, synchronous, no external API calls.
 *
 * Returns an object that matches the resumeData schema in resume.model.js.
 */

// ── Known section headers ────────────────────────────────────────────────────
const SECTION_MAP = {
    summary: ['summary', 'profile', 'objective', 'professional summary', 'career objective', 'about me'],
    skills: ['skills', 'technical skills', 'core competencies', 'key skills', 'tech stack', 'technologies', 'tools & technologies', 'tools and technologies'],
    projects: ['projects', 'project experience', 'personal projects', 'key projects', 'academic projects'],
    experience: ['experience', 'work experience', 'professional experience', 'employment', 'work history', 'internship', 'internships'],
    education: ['education', 'academic background', 'academic qualifications'],
};

// ── Skill categorization keyword maps ────────────────────────────────────────
const SKILL_BUCKETS = {
    languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c', 'c#', 'go', 'rust', 'kotlin', 'swift', 'ruby', 'php', 'scala', 'r', 'matlab', 'bash', 'shell'],
    frontend: ['react', 'vue', 'angular', 'svelte', 'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'next.js', 'nuxt', 'redux', 'webpack', 'vite', 'gatsby', 'three.js'],
    backend: ['node', 'express', 'django', 'flask', 'fastapi', 'spring', 'rails', 'laravel', 'fastify', 'graphql', 'rest', 'grpc', 'nest.js', 'nestjs', 'asp.net'],
    databases: ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'dynamodb', 'firestore', 'cassandra', 'elasticsearch', 'neo4j', 'supabase', 'prisma', 'sequelize', 'mongoose'],
    cloud: ['aws', 'azure', 'gcp', 'google cloud', 'cloudflare', 'heroku', 'vercel', 'netlify', 'digitalocean', 'kubernetes', 'docker', 'terraform', 'ci/cd', 'github actions', 'jenkins'],
    tools: ['git', 'github', 'gitlab', 'bitbucket', 'jira', 'figma', 'postman', 'vscode', 'linux', 'nginx', 'apache', 'webpack', 'babel', 'eslint', 'pytest', 'jest', 'mocha', 'selenium'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Detect which named section a line header belongs to, returns key or null */
const detectSection = (line) => {
    const l = line.trim().toLowerCase().replace(/:$/, '').trim();
    for (const [section, variants] of Object.entries(SECTION_MAP)) {
        if (variants.some(v => l === v || l.startsWith(v + ' ') || l.startsWith(v + ':'))) {
            return section;
        }
    }
    return null;
};

/** Returns true if the line looks like a section header */
const isSectionHeader = (line) => detectSection(line) !== null;

/** Extract a URL from a line (linkedin / github / http) */
const extractUrl = (line) => {
    const m = line.match(/https?:\/\/[^\s),]+|(?:linkedin|github)\.com\/[^\s),]+/i);
    return m ? m[0].trim() : null;
};

/** Extract LinkedIn URL from a block of text */
const extractLinkedIn = (text) => {
    const m = text.match(/(?:linkedin\.com\/in\/[^\s),;|\n]+|https?:\/\/(?:www\.)?linkedin\.com\/[^\s),;|\n]+)/i);
    return m ? (m[0].startsWith('http') ? m[0] : `https://${m[0]}`) : '';
};

/** Extract GitHub URL from a block of text */
const extractGitHub = (text) => {
    const m = text.match(/(?:github\.com\/[^\s),;|\n]+|https?:\/\/(?:www\.)?github\.com\/[^\s),;|\n]+)/i);
    return m ? (m[0].startsWith('http') ? m[0] : `https://${m[0]}`) : '';
};

/** Extract email from header block */
const extractEmail = (text) => {
    const m = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    return m ? m[0] : '';
};

/** Extract phone from header block */
const extractPhone = (text) => {
    const m = text.match(/(?:\+?\d[\d\s\-().]{7,}\d)/);
    return m ? m[0].trim() : '';
};

/** Strip bullet characters from a line */
const stripBullet = (line) => line.replace(/^[\s•\-*·▪▸►]+/, '').trim();

/** Determine if a line is a bullet point */
const isBullet = (line) => /^[\s]*[•\-*·▪▸►]/.test(line) || /^\s{2,}[a-z]/.test(line);

/** Try to extract date range from a line e.g. "Jan 2022 – Present" */
const extractDates = (line) => {
    const datePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*.?\s*\d{4}|\d{4}|present|current/gi;
    const matches = [...line.matchAll(datePattern)].map(m => m[0]);
    if (matches.length >= 2) return { startDate: matches[0], endDate: matches[1] };
    if (matches.length === 1) return { startDate: matches[0], endDate: '' };
    return { startDate: '', endDate: '' };
};

/** Categorize a skill token into one of 7 buckets */
const categorizeskill = (token) => {
    const t = token.toLowerCase().trim();
    for (const [bucket, keywords] of Object.entries(SKILL_BUCKETS)) {
        if (keywords.some(k => t === k || t.startsWith(k))) return bucket;
    }
    return 'core'; // default bucket
};

/** Parse a comma/slash separated skills line */
const parseSkillTokens = (text) =>
    text.split(/[,;|\/\n•·]+/)
        .map(s => s.replace(/^[\s\-*·▪▸►]+/, '').trim())
        .filter(s => s.length > 1 && s.length < 50);

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {string} rawText — the full extracted resume text
 * @returns {Object} resumeData matching the schema in resume.model.js
 */
export function parseResumeToStructured(rawText) {
    if (!rawText || rawText.trim().length < 20) {
        return buildEmptyResumeData();
    }

    const lines = rawText.replace(/\r\n/g, '\n').split('\n');

    // ── Pass 1: Split text into named sections ───────────────────────────────
    const sections = {}; // section name → string[]
    let currentSection = '__header__';
    sections[currentSection] = [];

    for (const line of lines) {
        const detected = detectSection(line);
        if (detected) {
            currentSection = detected;
            if (!sections[currentSection]) sections[currentSection] = [];
        } else {
            if (!sections[currentSection]) sections[currentSection] = [];
            sections[currentSection].push(line);
        }
    }

    const headerBlock = (sections['__header__'] || []).join('\n');

    // ── Personal Info (from header block) ────────────────────────────────────
    const headerLines = (sections['__header__'] || []).filter(l => l.trim());
    const fullName = headerLines[0]?.trim() || '';
    const title = headerLines[1]?.trim() || '';

    const personalInfo = {
        fullName,
        title,
        email: extractEmail(headerBlock),
        phone: extractPhone(headerBlock),
        linkedin: extractLinkedIn(rawText),
        github: extractGitHub(rawText),
    };

    // ── Summary ──────────────────────────────────────────────────────────────
    const summary = (sections['summary'] || [])
        .map(l => l.trim())
        .filter(l => l.length > 5)
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // ── Skills ───────────────────────────────────────────────────────────────
    const skillsResult = { languages: [], core: [], frontend: [], backend: [], databases: [], cloud: [], tools: [] };
    const skillLines = sections['skills'] || [];
    const allSkillTokens = [];

    for (const line of skillLines) {
        // Handle "Languages: Python, Java" format
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 35) {
            const val = line.slice(colonIdx + 1);
            parseSkillTokens(val).forEach(t => allSkillTokens.push(t));
        } else {
            parseSkillTokens(line).forEach(t => allSkillTokens.push(t));
        }
    }

    const seen = new Set();
    for (const token of allSkillTokens) {
        const clean = token.trim();
        if (!clean || seen.has(clean.toLowerCase())) continue;
        seen.add(clean.toLowerCase());
        const bucket = categorizeskill(clean);
        skillsResult[bucket].push(clean);
    }

    // ── Projects ─────────────────────────────────────────────────────────────
    const projects = [];
    const projLines = sections['projects'] || [];
    let currProj = null;

    for (const line of projLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (!isBullet(line) && trimmed.length < 120 && !trimmed.startsWith('http')) {
            // Likely a project title line (may include link)
            if (currProj) projects.push(currProj);
            const link = extractUrl(trimmed) || '';
            const name = trimmed.replace(/https?:\/\/[^\s]+/g, '').replace(/github\.com\/[^\s]+/gi, '').trim();
            currProj = { name, link, descriptionPoints: [] };
        } else if (currProj) {
            const bullet = stripBullet(trimmed);
            if (bullet.length > 5) currProj.descriptionPoints.push(bullet);
        }
    }
    if (currProj) projects.push(currProj);

    // ── Experience ───────────────────────────────────────────────────────────
    const experience = [];
    const expLines = sections['experience'] || [];
    let currExp = null;

    for (const line of expLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (!isBullet(line) && trimmed.length < 120) {
            const dates = extractDates(trimmed);
            const hasDates = dates.startDate || dates.endDate;

            if (hasDates) {
                // This line contains role + dates
                if (currExp) experience.push(currExp);
                const roleText = trimmed
                    .replace(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*.?\s*\d{4}/gi, '')
                    .replace(/present|current/gi, '')
                    .replace(/[–—\-|]/g, '')
                    .replace(/\d{4}/g, '')
                    .trim();
                currExp = {
                    role: roleText,
                    organization: '',
                    startDate: dates.startDate,
                    endDate: dates.endDate,
                    points: [],
                };
            } else if (currExp && !currExp.organization) {
                // Second non-bullet line likely is org name
                currExp.organization = trimmed;
            }
        } else if (currExp) {
            const bullet = stripBullet(trimmed);
            if (bullet.length > 5) currExp.points.push(bullet);
        }
    }
    if (currExp) experience.push(currExp);

    // ── Education ────────────────────────────────────────────────────────────
    const education = [];
    const eduLines = sections['education'] || [];
    let currEdu = null;

    for (const line of eduLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const dates = extractDates(trimmed);
        const hasDates = dates.startDate || dates.endDate;

        if (!isBullet(line)) {
            if (hasDates) {
                if (currEdu) education.push(currEdu);
                const degreeText = trimmed
                    .replace(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*.?\s*\d{4}/gi, '')
                    .replace(/present|current|\d{4}/gi, '')
                    .replace(/[–—\-|]/g, ' ')
                    .trim();
                currEdu = {
                    degree: degreeText,
                    institution: '',
                    startYear: dates.startDate,
                    endYear: dates.endDate,
                };
            } else if (currEdu && !currEdu.institution) {
                currEdu.institution = trimmed;
            } else {
                if (currEdu) education.push(currEdu);
                currEdu = { degree: trimmed, institution: '', startYear: '', endYear: '' };
            }
        }
    }
    if (currEdu) education.push(currEdu);

    return {
        personalInfo,
        summary,
        skills: skillsResult,
        projects,
        experience,
        education,
    };
}

/** Returns an empty resumeData object (for fallback) */
export function buildEmptyResumeData() {
    return {
        personalInfo: { fullName: '', title: '', email: '', phone: '', linkedin: '', github: '' },
        summary: '',
        skills: { languages: [], core: [], frontend: [], backend: [], databases: [], cloud: [], tools: [] },
        projects: [],
        experience: [],
        education: [],
    };
}

/**
 * Converts a resumeData object back to plain text for ATS scoring.
 * The ATS engine only needs plain text — this reconstructs it cleanly.
 * @param {Object} resumeData
 * @returns {string}
 */
export function resumeDataToText(resumeData) {
    if (!resumeData) return '';
    const lines = [];

    const { personalInfo, summary, skills, projects, experience, education } = resumeData;

    // Header
    if (personalInfo?.fullName) lines.push(personalInfo.fullName);
    if (personalInfo?.title) lines.push(personalInfo.title);
    if (personalInfo?.email) lines.push(personalInfo.email);
    if (personalInfo?.linkedin) lines.push(personalInfo.linkedin);
    if (personalInfo?.github) lines.push(personalInfo.github);
    lines.push('');

    // Summary
    if (summary) {
        lines.push('SUMMARY');
        lines.push(summary);
        lines.push('');
    }

    // Skills
    const allSkills = Object.values(skills || {}).flat();
    if (allSkills.length) {
        lines.push('SKILLS');
        lines.push(allSkills.join(', '));
        lines.push('');
    }

    // Experience
    if (experience?.length) {
        lines.push('EXPERIENCE');
        for (const exp of experience) {
            lines.push(`${exp.role}  ${exp.startDate} – ${exp.endDate}`);
            if (exp.organization) lines.push(exp.organization);
            (exp.points || []).forEach(p => lines.push(`• ${p}`));
            lines.push('');
        }
    }

    // Projects
    if (projects?.length) {
        lines.push('PROJECTS');
        for (const proj of projects) {
            lines.push(proj.name + (proj.link ? `  ${proj.link}` : ''));
            (proj.descriptionPoints || []).forEach(p => lines.push(`• ${p}`));
            lines.push('');
        }
    }

    // Education
    if (education?.length) {
        lines.push('EDUCATION');
        for (const edu of education) {
            lines.push(`${edu.degree}  ${edu.startYear} – ${edu.endYear}`);
            if (edu.institution) lines.push(edu.institution);
            lines.push('');
        }
    }

    return lines.join('\n');
}
