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

    // ── R2 Storage — key of the original uploaded file in Cloudflare R2 ──────
    // This is the single source of truth for resume content.
    originalFileKey: {
        type: String,
        default: ''
    },

    // ── Extracted plain text (for ATS scoring and AI improve) ────────────────
    parsedText: {
        type: String,
        default: ''
    },
    // Structured JSON data (sections, items etc.)
    content: {
        type: Object,
        default: null
    },
    originalContent: {
        type: String,
        default: ''
    },

    // ── ATS Score Tracking ────────────────────────────────────────────────────
    atsScore: {
        type: Number,
        default: 0
    },
    suggestionsCount: {
        type: Number,
        default: 0
    },
    analysis: {
        matchedSkills: { type: [String], default: [] },
        missingSkills: { type: [String], default: [] },
        missingCriticalSkills: { type: [String], default: [] },
        suggestions: { type: [String], default: [] }
    },

    // ── Versioning ────────────────────────────────────────────────────────────
    versions: [{
        versionNumber: {
            type: Number,
            required: true
        },
        fileKey: {
            type: String,  // R2 key for the PDF of this version
            default: ''
        },
        atsScore: {
            type: Number,
            default: 0
        },
        type: {
            type: String,
            enum: ['original', 'optimized', 'regenerated', 'manual-edit', 'restored'],
            default: 'manual-edit'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],

    versionCounter: {
        type: Number,
        default: 0
    },
    
    // ── Analysis History ──────────────────────────────────────────────────────
    // Each entry represents a separate JD match for this specific resume content
    analyses: [{
        jdTitle: String,
        jdText: String,
        atsScore: Number,
        analysis: {
            matchedSkills: { type: [String], default: [] },
            missingSkills: { type: [String], default: [] },
            missingCriticalSkills: { type: [String], default: [] },
            suggestions: { type: [String], default: [] }
        },
        aiSuggestions: String,
        timestamp: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;