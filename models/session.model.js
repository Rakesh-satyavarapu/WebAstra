const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Reference to mentor (from User model)
        required: true
    },
    mentee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Reference to mentee (from User model)
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String, // Example: "10:00 AM - 11:00 AM"
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'canceled'],
        default: 'scheduled'
    },
    sessionType: {
        type: String,
        enum: ['video', 'chat'],
        default: 'video'
    },
    meetingLink: {
        type: String, // Optional: Store Google Meet/Zoom link
        default: ''
    },
    feedback: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    }
}, { timestamps: true });

const Session = mongoose.model('session', sessionSchema);
module.exports = Session;
