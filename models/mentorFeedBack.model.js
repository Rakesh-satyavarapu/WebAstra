const mongoose = require("mongoose");

const mentorFeedbackSchema = new mongoose.Schema({
    mentorName: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const MentorFeedback = mongoose.model("MentorFeedback", mentorFeedbackSchema);

module.exports = MentorFeedback;
