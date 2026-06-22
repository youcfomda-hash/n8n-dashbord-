require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dashboard')));

const upload = multer({ dest: 'uploads/' });

// Database setup
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    // 1. Create table with 'email' if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE,
            password TEXT,
            apiKey TEXT UNIQUE,
            facebookToken TEXT,
            instagramToken TEXT,
            youtubeToken TEXT,
            tiktokToken TEXT
        )
    `);

    // 2. Run migration: Rename 'username' to 'email' if the database is older
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (!err && columns) {
            const hasUsername = columns.some(col => col.name === 'username');
            const hasEmail = columns.some(col => col.name === 'email');
            if (hasUsername && !hasEmail) {
                db.run("ALTER TABLE users RENAME COLUMN username TO email", (alterErr) => {
                    if (alterErr) {
                        console.error("Failed to rename username column to email:", alterErr);
                    } else {
                        console.log("Successfully migrated database: renamed 'username' to 'email'");
                    }
                });
            }
        }
    });
});

// Authentication Middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!apiKey) return res.status(401).json({ error: 'API key missing' });

    db.get('SELECT * FROM users WHERE apiKey = ?', [apiKey], (err, row) => {
        if (err || !row) return res.status(403).json({ error: 'Invalid API key' });
        req.user = row;
        next();
    });
};

// 1. User Auth
app.post('/auth/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const apiKey = `sk_${uuidv4().replace(/-/g, '')}`;

    db.run('INSERT INTO users (id, email, password, apiKey) VALUES (?, ?, ?, ?)', 
        [userId, email, hashedPassword, apiKey], function(err) {
            if (err) return res.status(400).json({ error: 'Email may already exist' });
            res.json({ message: 'User registered successfully', apiKey });
    });
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
        
        const { password: _, ...userData } = user;
        res.json({ token, user: userData });
    });
});

// GET user info
app.get('/api/user', authenticateJWT, (req, res) => {
    db.get('SELECT id, email, apiKey, facebookToken, instagramToken, youtubeToken, tiktokToken FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
    });
});



// The cURL Upload API Endpoint
app.post('/api/upload', authenticateAPIKey, upload.single('video'), async (req, res) => {
    try {
        const { title, platforms, cloud_name, upload_preset, webhook_url } = req.body;
        const file = req.file;
        let videoUrl = req.body.video_url;

        let parsedPlatforms = [];
        if (Array.isArray(platforms)) parsedPlatforms = platforms;
        else if (typeof platforms === 'string') parsedPlatforms = platforms.split(',');

        if (!title || parsedPlatforms.length === 0 || (!file && !videoUrl)) {
            return res.status(400).json({ error: 'Missing required fields: video/video_url, title, platforms' });
        }
        
        if (file && (!cloud_name || !upload_preset)) {
            return res.status(400).json({ error: 'Missing Cloudinary settings (Cloud Name and Upload Preset are required for file uploads)' });
        }
        
        if (!webhook_url) {
            return res.status(400).json({ error: 'Missing n8n Webhook URL. Please configure it in the dashboard Settings.' });
        }

        if (file) {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(file.path));
            formData.append('upload_preset', upload_preset);
            formData.append('folder', 'social_media');
            
            const cloudRes = await axios.post(
                `https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, 
                formData,
                { headers: formData.getHeaders() }
            );
            videoUrl = cloudRes.data.secure_url;
            fs.unlinkSync(file.path);
        }

        const n8nPayload = {
            "video_url": videoUrl,
            "Video Caption": title,
            "platforms": parsedPlatforms,
            "filename": file ? file.originalname : "uploaded_video.mp4"
        };

        const n8nRes = await axios.post(webhook_url, n8nPayload);

        res.json({
            success: true,
            message: 'Post successfully queued',
            video_url: videoUrl,
            platforms: parsedPlatforms
        });

    } catch (error) {
        console.error('Upload Error:', error.response?.data || error.message);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: error.response?.data?.error?.message || error.message || 'Failed to process upload' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`SaaS Backend running on http://localhost:${process.env.PORT}`);
});
