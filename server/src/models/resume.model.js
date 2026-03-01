import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        default: 'My Resume'
    },

    // ATS Score Tracking
    atsScore: {
        type: Number,
        default: 0
    },
    suggestionsCount: {
        type: Number,
        default: 0
    },

    // Core Sections
    personalInfo: {
        fullName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
        website: { type: String, default: "" },
        summary: { type: String, default: "" }
    },

    // Professional Experience
    experience: [{
        company: String,
        position: String,
        location: String,
        startDate: String,
        endDate: String,
        current: { type: Boolean, default: false },
        description: String // This will be the target for AI Optimization
    }],

    // Education
    education: [{
        school: String,
        degree: String,
        fieldOfStudy: String,
        startDate: String,
        endDate: String,
        gpa: String
    }],

    // Industry-Critical Sections
    skills: {
        technical: [String], // e.g., Java, React, Docker
        soft: [String],      // e.g., Leadership, Communication
        tools: [String]      // e.g., Figma, Git
    },

    certifications: [{
        name: String,
        issuer: String,
        date: String,
        url: String
    }],

    projects: [{
        name: String,
        description: String,
        technologies: [String],
        link: String
    }],

    languages: [{
        language: String,
        proficiency: String // e.g., Native, Professional
    }],

    // Versioning Support
    originalContent: {
        type: String,
        default: ""
    },

    versions: [{
        content: String,
        feedback: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    currentVersionIndex: {
        type: Number,
        default: 0
    },

    // R2 Storage — key of the original uploaded PDF in Cloudflare R2
    originalFileKey: {
        type: String,
        default: ''
    },

    // ── Structured Resume Data (populated by structuredResumeParser) ───────────
    // Used for: professional rendering, AI optimization, structured editing
    // parsedText / versions / originalContent continue to drive ATS scoring
    resumeData: {
        personalInfo: {
            fullName: { type: String, default: '' },
            title: { type: String, default: '' },
            email: { type: String, default: '' },
            phone: { type: String, default: '' },
            linkedin: { type: String, default: '' },
            github: { type: String, default: '' },
        },
        summary: { type: String, default: '' },
        skills: {
            languages: { type: [String], default: [] },
            core: { type: [String], default: [] },
            frontend: { type: [String], default: [] },
            backend: { type: [String], default: [] },
            databases: { type: [String], default: [] },
            cloud: { type: [String], default: [] },
            tools: { type: [String], default: [] },
        },
        projects: [{
            name: { type: String, default: '' },
            link: { type: String, default: '' },
            descriptionPoints: { type: [String], default: [] },
        }],
        experience: [{
            role: { type: String, default: '' },
            organization: { type: String, default: '' },
            startDate: { type: String, default: '' },
            endDate: { type: String, default: '' },
            points: { type: [String], default: [] },
        }],
        education: [{
            degree: { type: String, default: '' },
            institution: { type: String, default: '' },
            startYear: { type: String, default: '' },
            endYear: { type: String, default: '' },
        }],
    }

}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;