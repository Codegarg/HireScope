import mongoose from "mongoose";

const versionSchema = new mongoose.Schema({
    content: { type: String, required: true },
    feedback: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const resumeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: { type: String, default: "My Resume" },
        originalContent: { type: String, required: true },
        versions: [versionSchema],
        currentVersionIndex: { type: Number, default: 0 }
    },
    { timestamps: true }
);

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;
