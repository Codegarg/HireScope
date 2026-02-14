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
    }]

}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;