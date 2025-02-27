const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    mentorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    menteeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        required: false
    }
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
