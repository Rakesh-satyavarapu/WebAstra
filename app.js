const express = require('express');
const app = express();
const axios = require('axios');
let env = require('dotenv')
let path = require('path')
env.config();  
const PORT = process.env.PORT || 3000;
let bcrypt=require('bcrypt')
let jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public'))
app.use(cookieParser())

app.set("view engine", "ejs");

const mongoose = require('mongoose')
let userSchema = require('./models/user.model')
let MailSchema = require('./models/emailPost.model')

// Function to summarize email using Hugging Face API
const summarizeEmail = async (emailText) => {
    const apiKey = process.env.HUGGING_FACE_API_KEY;  // Fetch API key from .env

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
    };

    const body = {
        inputs: emailText,
    };

    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',  // Summarization model
            body,
            { headers }
        );
        return response.data[0].summary_text;
    } catch (error) {
        console.error("Error during API request:", error);
        return { error: 'Failed to summarize email' };
    }
};

app.get('/',(req,res)=>{
    res.render('register')
})

app.post('/createUser',async (req,res)=>{
    let {firstname,lastname,username,email,password}=req.body
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt,async(err,hash)=>{
            
            let createdUser = await userSchema.create({firstname,lastname,username,email,password:hash})
            console.log("user created",createdUser.username,createdUser.password)
            // res.render("home",{email:createdUser.email})
            res.redirect('/home')
        })
    })

    let token = jwt.sign({email:email},process.env.JWT_SECRET)
    res.cookie("token",token)
})

app.get('/login',(req,res)=>{
    res.render('login')
})

app.post('/login',async(req,res)=>{
    let{email,password}=req.body;
    let user = await userSchema.findOne({email})
    if(user)
    {
        bcrypt.compare(password,user.password,(err,result)=>{
            console.log(result)
            if(result)
            {
                let token = jwt.sign({email:email},process.env.JWT_SECRET)
                res.cookie('token',token)
                // res.render('home',{user:user})
                res.redirect('/home')
            }
            else
            {
                res.send('invalid creditinals wrong password or email')
            }
        })    
    }
    else{res.redirect('/')}
})

app.get('/logout',(req,res)=>{
    res.cookie('token',"")
    res.redirect('/login')
})

app.get('/home',(req,res)=>{
    res.render("Mail");
});

function isLoggedIn(req,res,next)
{
    if(req.cookies.token === "")
    {
       return res.redirect('/login')
    }
    else{
        let data = jwt.verify(req.cookies.token,process.env.JWT_SECRET)
        req.user=data
    }
    next()
}
// API endpoint for summarizing email
app.post('/api/summarize',isLoggedIn, async (req, res) => {
    const { emailText,name } = req.body;
    let userdetails = await userSchema.findOne({email:req.user.email});
    let mailData=await MailSchema.create({user:userdetails._id,name,Mailcontent:emailText})
    userdetails.posts.push(mailData._id)
    await userdetails.save()
    if (!emailText) {
        return res.status(400).send({ error: 'No email content provided' });
    }

    const summary = await summarizeEmail(emailText);
    return res.render("summary", { summaryD: summary });
});

app.get('/allMailUploads',isLoggedIn,async(req,res)=>{
    let user=await userSchema.findOne({email:req.user.email}).populate('posts')
    res.render('Allmails',{posts:user.posts})
})

app.get('/mailview/:name',isLoggedIn,async(req,res)=>{
    let mail= await MailSchema.findOne({name:req.params.name})
    let con=mail.Mailcontent
    res.send(con)
})

mongoose.connect(`${process.env.MONGODB_URL}/projectDB`)
.then(()=>{
    console.log('database connected')
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
})
})

.catch((err)=>{console.log('error',err.message)})

const { spawn } = require('child_process'); // For spawning Python process

// API route for classification
app.post('/api/classify',isLoggedIn ,async (req, res) => {
    const { emailText,name } = req.body;
    let userdetails = await userSchema.findOne({email:req.user.email});
    let mailData=await MailSchema.create({user:userdetails._id,name,Mailcontent:emailText})
    userdetails.posts.push(mailData._id)
    await userdetails.save()
    if (!emailText) {
        return res.status(400).send({ error: 'No email content provided' });
    }

    // Spawn a new Python process to classify the email
    const pythonProcess = spawn('python', ['predict.py', emailText]);

    let result = '';
    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            // Send the classification result as a response
            res.render("classify",{ classification: result });
        } else {
            res.status(500).send({ error: 'Error during classification' });
        }
    });
});
