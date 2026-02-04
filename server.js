require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// API key protection
const HACKATHON_API_KEY = process.env.HACKATHON_API_KEY || "your_chosen_secret_key"; // set in Render Env Variables
const checkApiKey = (req, res, next) => {
    const userKey = req.headers['x-api-key'];
    if (userKey === HACKATHON_API_KEY) {
        return next();
    }
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
};

// Initialize AI carefully
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: GEMINI_API_KEY is missing!");
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/honeypot', checkApiKey, async (req, res) => {
    console.log("📥 Incoming Message:", req.body.message);

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "No message provided" });

        // 1. Initialize AI with the latest stable alias
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing in Environment Variables");
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: { 
                temperature: 0.7,
                topP: 0.8,
                maxOutputTokens: 200 
            }
        });

        // 2. Generate Content
        const result = await model.generateContent(`
            Persona: You are Mrs. Lakshmi, a 70-year-old grandmother from India. 
            Traits: Polite, slightly technologically challenged, very talkative about her grandson.
            Task: Engage the scammer to keep them talking.
            Scammer Message: "${message}"
        `);
        
        const response = await result.response;
        const aiReply = response.text();

        console.log("✅ AI Success:", aiReply);

        // 3. Extraction & Response
        res.status(200).json({
            classification: "Scam Detected",
            next_reply: aiReply,
            extracted_intelligence: {
                upi_ids: message.match(/[a-zA-Z0-9.\-_]+@\w+/g) || [],
                bank_accounts: message.match(/\b\d{9,18}\b/g) || [],
                phishing_links: message.match(/https?:\/\/[^\s]+/g) || []
            }
        });

    } catch (err) {
        console.log("❌ ERROR:", err.message);
        res.status(500).json({ 
            error: "Honeypot Logic Error", 
            details: err.message 
        });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running"));
