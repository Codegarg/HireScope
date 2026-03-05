import { callCloudflareAINonStreaming } from "./ai.service.js";

/**
 * AI-powered service to convert parsed resume text into structured JSON.
 * Returns an object matching the resumeData schema.
 */
export const extractStructuredResume = async (parsedText) => {
    if (!parsedText || parsedText.trim().length < 50) {
        throw new Error("Parsed text too short for structure extraction");
    }

    const systemPrompt = `You are a high-fidelity resume parsing engine. 
Your goal is to extract structured information from a resume's text and return ONLY valid JSON.
DO NOT fabricate details. If a field is missing, use empty strings or empty arrays.`;

    const userPrompt = `Convert the following resume text into a structured JSON object.

REQUIRED SCHEMA:
{
  "personalInfo": {
    "fullName": "Full Name",
    "title": "Current professional title (e.g., Software Engineer)",
    "email": "Email address",
    "phone": "Phone number",
    "linkedin": "LinkedIn URL",
    "github": "GitHub URL"
  },
  "summary": "Professional summary paragraph",
  "skills": {
    "languages": ["e.g., JavaScript", "Python"],
    "core": ["e.g., Problem Solving", "Leadership"],
    "frontend": ["e.g., React", "HTML5"],
    "backend": ["e.g., Node.js", "Express"],
    "databases": ["e.g., MongoDB", "PostgreSQL"],
    "cloud": ["e.g., AWS", "Docker"],
    "tools": ["e.g., Git", "VS Code"]
  },
  "projects": [
    {
      "name": "Project Name",
      "link": "Project URL (if any)",
      "descriptionPoints": ["Detail about project", "Another detail"]
    }
  ],
  "experience": [
    {
      "role": "Job Title",
      "organization": "Company Name",
      "startDate": "Start Date",
      "endDate": "End Date",
      "points": ["Work detail", "Achievement"]
    }
  ],
  "education": [
    {
      "degree": "Degree and Major",
      "institution": "School Name",
      "startYear": "Start Year",
      "endYear": "End Year"
    }
  ]
}

RESUME TEXT:
${parsedText.substring(0, 4000)}`;

    try {
        const aiResponse = await callCloudflareAINonStreaming(systemPrompt, userPrompt);

        // Strip markdown fences
        const cleanJson = aiResponse
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        const start = cleanJson.indexOf('{');
        const end = cleanJson.lastIndexOf('}');

        if (start === -1 || end === -1) throw new Error("No JSON object found in AI response");

        const structuredData = JSON.parse(cleanJson.slice(start, end + 1));

        // Basic normalization
        if (!structuredData.personalInfo) structuredData.personalInfo = {};
        if (!structuredData.skills) structuredData.skills = { languages: [], core: [], frontend: [], backend: [], databases: [], cloud: [], tools: [] };
        if (!Array.isArray(structuredData.experience)) structuredData.experience = [];
        if (!Array.isArray(structuredData.projects)) structuredData.projects = [];
        if (!Array.isArray(structuredData.education)) structuredData.education = [];

        return structuredData;
    } catch (error) {
        console.error("[resumeStructure.service] Error extracting structure:", error);
        throw error;
    }
};
