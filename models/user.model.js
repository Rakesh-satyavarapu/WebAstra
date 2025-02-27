let mongoose = require('mongoose')

let userSchema = mongoose.Schema({
    firstname:{
        type:String,
        required:[true,'enter first name']
    },
    lastname:{
        type:String,
        required:[true,'enter last name']
    },
    username:{
        type:String,
        required:[true,'enter user name'],
        unique:[true,'Username already Exists']
    },
    email:{
        type:String,
        required:true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email address',
        ],
        unique:[true,'Email already exists']
    },
    password:{
        type:String,
        required:[true,"enter password"]
    },
    role: {
        type: String,
        enum: ['mentor', 'mentee'],
        required: true
    },
    expertise: { // For Mentors
        type: [String],
        default: []
    },
    bio: { // For Mentors
        type: String,
        default: ''
    },
    availability: { // For Mentors
        type: String, // Example: "Monday-Friday 6PM-9PM"
        default: ''
    },
    interests: { // For Mentees
        type: [String],
        default: []
    },
    sessions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'session'
    }],
    mentorId: { // For Mentees (Optional)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    }//reference is name of table or document
},{timestamps:true})

let user = mongoose.model('user',userSchema)
module.exports = user