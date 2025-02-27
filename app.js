const express = require('express');
const app = express();
const axios = require('axios');
const env = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session'); // Add express-session
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const userSchema = require('./models/user.model');
const questSchema = require('./models/quest.model');


const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

env.config();  

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

//session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }  // Set to `true` in production with HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

// Routes
app.get('/', (req, res) => {
    res.render('login');
});

app.post('/createUser', async (req, res) => {
    try {
        if (req.cookies.token) {
            return res.send("Error: Please log out before registering a new account.");
        }

        // Extract all required fields from request body
        let { firstname, lastname, username, email, password, role, expertise, bio, availability, interests } = req.body;
        
        let checkEmail = await userSchema.findOne({ email });
        if (checkEmail) return res.send("Error: Email already exists");

        let checkUser = await userSchema.findOne({ username });
        if (checkUser) return res.send("Error: Username already exists");

        // Hash the password before storing it
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let userData = {
            firstname,
            lastname,
            username,
            email,
            password: hashedPassword,
            role
        };

        // Add mentor-specific fields
        if (role === 'mentor') {
            userData.expertise = expertise ? expertise.split(",") : [];
            userData.bio = bio || "";
            userData.availability = availability || "";
        }
        // Add mentee-specific fields
        else if (role === 'mentee') {
            userData.interests = interests ? interests.split(",") : [];
        }

        let createdUser = await userSchema.create(userData);
        console.log("User created:", createdUser.username);

        // Generate and set JWT token
        let token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie("token", token, { httpOnly: true });

        res.redirect('/');
    } catch (err) {
        console.log("Error while creating user:", err);
        res.send("Unexpected error occurred");
    }
});

app.get('/viewP',(req,res)=>{res.render('ViewProfile')})

app.get('/findM',isLoggedIn,async(req,res)=>{
        try {
            let mentors = await userSchema.find({ role: 'mentor' }).select('firstname lastname email bio expertise availability'); 
            let token = req.user
            res.render('FindMentor', { mentors,token });
        } catch (error) {
            console.error('Error fetching mentors:', error);
            res.status(500).send('Internal Server Error');
        }
    });

app.get('/chat',isLoggedIn,async(req,res)=>{
    let user = await userSchema.findOne({email:req.user.email})
    res.render('Chat',{user})})

app.get('/schedule',isLoggedIn,async(req,res)=>{
    let user = await userSchema.findOne({email:req.user.email}).populate('session')
    res.render('Schedule',{user})
})

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/mente', (req, res) => {
    res.render('findMentor');
});


app.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        let user = await userSchema.findOne({ email });

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                let token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.cookie('token', token, { httpOnly: true });
                res.redirect('/home');
            } else {
                res.send('Invalid credentials: Wrong password or email');
            }
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.log("Error during login:", err);
        res.send('Unexpected error occurred');
    }
});

const { spawn } = require('child_process');

app.post('/chatInput', isLoggedIn, async (req, res) => {
    let { quest } = req.body;

    if (!quest) {
        return res.render("Chat", { user: { username: req.user.email }, response: "Please enter a question!" });
    }

    try {
        // Store the question in MongoDB
        let userdetails = await userSchema.findOne({ email: req.user.email });
        let questionData = await questSchema.create({ user: userdetails._id, quest });

        // Spawn a Python process to handle the AI response
        const pythonProcess = spawn('python', ['predict.py', quest]);

        let responseText = '';
        pythonProcess.stdout.on('data', (data) => {
            responseText += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code === 0) {
                // Render the chat page with AI response
                res.render("Chat", { user: userdetails, response: responseText.trim() });
            } else {
                res.status(500).send({ error: 'Error processing AI response' });
            }
        });

    } catch (error) {
        console.error("Error handling chat input:", error);
        res.render("Chat", { user: { username: req.user.email }, response: "Error processing request." });
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.logout(() => {
        res.redirect('/');
    });
});

app.get('/home',isLoggedIn, async(req, res) => {
    let user = await userSchema.findOne({email:req.user.email})
    res.render("home", { token: req.cookies.token,user });
});


function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/');
    }
    
    try {
        let data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data;
        next();
    } catch (err) {
        console.log("JWT Error:", err);
        res.redirect('/');
    }
}

// Passport Configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await userSchema.findOne({ email: profile.emails[0].value });

        if (user) {
            return done(null, user);
        } else {
            let newUser = await userSchema.create({
                firstname: profile.name.givenName,
                lastname: profile.name.familyName,
                username: profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                password: '' // OAuth users don't need a password
            });

            return done(null, newUser);
        }
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        let user = await userSchema.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Authentication Routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        let token = jwt.sign({ email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.redirect('/home');
    });

// MongoDB Connection
mongoose.connect(`${process.env.MONGODB_URL}/WebAstraDB`, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Database connected');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.log('Database connection error:', err.message);
    });







// const express = require('express');
// const app = express();
// const axios = require('axios');
// let env = require('dotenv')
// let path = require('path')
// env.config();  
// const PORT = process.env.PORT || 3000;
// let bcrypt=require('bcrypt')
// let jwt = require('jsonwebtoken')
// const cookieParser = require('cookie-parser')


// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth20').Strategy;


// app.use(express.json());
// app.use(express.urlencoded({extended:true}));
// app.use(express.static('public'))
// app.use(cookieParser())

// app.set("view engine", "ejs");

// const mongoose = require('mongoose')
// let userSchema = require('./models/user.model')
// // let MailSchema = require('./models/emailPost.model')


// app.get('/',(req,res)=>{
//     res.render('login')
// })

// app.get('/login',(req,res)=>{
//     res.render('login')
// })

// app.post('/createUser',async (req,res)=>{
//     try
//     {
//         if (req.cookies.token) 
//         {
//             return res.send("Error: Please log out before registering a new account.");
//         }
//         let {firstname,lastname,username,email,password}=req.body
//         let checkEmail = await userSchema.findOne({email})
//         if (checkEmail){res.send("error while creating user: Email already exist")}
//         let checkUser = await userSchema.findOne({username})
//         if (checkUser){res.send("error while creating user: user name already exist")}
//         bcrypt.genSalt(10,(err,salt)=>{
//             if(err)
//             {
//                 console.log("error in generating salt",err)
//                 res.send("Error in Generating Salt")
//             }
//             bcrypt.hash(password,salt,async(err,hash)=>{
//             if(err)
//             {
//                 console.log("error in hashing",err)
//                 res.send("Error in Hashing Password")
//             }
//                 let createdUser = await userSchema.create({firstname,lastname,username,email,password:hash})
//                 console.log("user created",createdUser.username,createdUser.password)
//                 // res.render("home",{email:createdUser.email})
//                 res.redirect('/')
//             })
//         })

//         let token = jwt.sign({email:email},process.env.JWT_SECRET)
//         res.cookie("token",token,{ httpOnly: true })}
//     catch (err) 
//     {
//         console.log("error while creating user",err)
//     }
// })

// app.get('/register',(req,res)=>{
//     res.render('register')
// })

// app.post('/login',async(req,res)=>{
//     try
//     {
//         if (req.cookies.token) 
//             {
//                 return res.send("Error: Please log out before logging in with a different account.");
//             }
//             let{email,password}=req.body;
//             let user = await userSchema.findOne({email})
//             if(user)
//             {
//                 bcrypt.compare(password,user.password,(err,result)=>{
//                     console.log(result)
//                     if(result)
//                     {
//                         let token = jwt.sign({email:email},process.env.JWT_SECRET)
//                         res.cookie('token',token,{ httpOnly: true })
//                         // res.render('home',{user:user})
//                         res.render('home',{token:token})
//                     }
//                     else
//                     {
//                         res.send('invalid creditinals wrong password or email')
//                     }
//                 })    
//             }
//             else{res.redirect('/')}
//     }
//     catch(err){return res.send('Unexpected error Occured')}
// })

// app.get('/logout',(req,res)=>{
//     res.cookie('token',"", { httpOnly: true })
//     res.redirect('/')
// })

// app.get('/home',isLoggedIn,(req,res)=>{
//     res.render("Home",{token:req.cookies.token});
// });

// function isLoggedIn(req,res,next)
// {
//     if(req.cookies.token === "")
//     {
//        return res.redirect('/login')
//     }
//     else{
//         let data = jwt.verify(req.cookies.token,process.env.JWT_SECRET)
//         req.user=data
//     }
//     next()
// }

// // Passport configuration
// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/google/callback"
//   },
//   async (accessToken, refreshToken, profile, done) => {
//     try {
//       let user = await userSchema.findOne({ email: profile.emails[0].value });
//       if (user) {
//         return done(null, user);
//       } else {
//         // Create a new user if not found
//         let newUser = await userSchema.create({
//           firstname: profile.name.givenName,
//           lastname: profile.name.familyName,
//           username: profile.emails[0].value.split('@')[0],
//           email: profile.emails[0].value,
//           password: '' // Since it's OAuth, password is not required
//         });
//         return done(null, newUser);
//       }
//     } catch (err) {
//       return done(err, null);
//     }
//   }
// ));

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser(async (id, done) => {
//   try {
//     let user = await userSchema.findById(id);
//     done(null, user);
//   } catch (err) {
//     done(err, null);
//   }
// });

// app.get('/auth/google',
//     passport.authenticate('google', { scope: ['profile', 'email'] }));
  
//   app.get('/auth/google/callback',
//     passport.authenticate('google', { failureRedirect: '/' }),
//     (req, res) => {
//       // Successful authentication, redirect home.
//       let token = jwt.sign({ email: req.user.email }, process.env.JWT_SECRET);
//       res.cookie('token', token, { httpOnly: true });
//       res.redirect('/home');
//     });
  
// mongoose.connect(`${process.env.MONGODB_URL}/WebAstraDB`)
// .then(()=>{
//     console.log('database connected')
//     app.listen(PORT, () => {
//         console.log(`Server running on http://localhost:${PORT}`);
// })
// })
// .catch((err)=>{console.log('error',err.message)})