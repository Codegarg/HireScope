import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const chatSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            default: "New Conversation",
        },
        messages: [messageSchema],
        context: {
            resumeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Resume",
            },
            jobDescription: String,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);


const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
