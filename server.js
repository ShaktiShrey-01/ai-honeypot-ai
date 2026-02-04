require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// API key protection (inline auth)
const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";

// Initialize AI carefully
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: GEMINI_API_KEY is missing!");
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/honeypot', async (req, res) => {
    // --- 1. THE AUTH CHECK ---
    const incomingKey = req.headers['x-api-key'];
    
    if (!incomingKey || incomingKey !== MY_SECRET_KEY) {
        console.log("❌ Blocked: Unauthorized request");
        return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
    }
    console.log("📥 Incoming Message:", req.body.message);

    try {
        // --- DEFENSIVE FIX STARTS HERE ---
        const { message } = req.body;
        const safeMessage = typeof message === 'string' ? message : "";

        // 1. Extraction using the safeMessage
        const upis = safeMessage.match(/[a-zA-Z0-9.\-_]+@\w+/g) || [];
        const accounts = safeMessage.match(/\b\d{9,18}\b/g) || [];
        const links = safeMessage.match(/https?:\/\/[^\s]+/g) || [];

        // 2. AI Logic (Only call AI if there is a message to reply to)
        let aiReply = "Oh dear, I didn't catch that. Could you repeat it?";
        if (safeMessage.length > 0) {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const result = await model.generateContent(`Act as Mrs. Lakshmi, reply to: ${safeMessage}`);
            const response = await result.response;
            aiReply = response.text();
        }

        // 3. Success Response
        res.status(200).json({
            classification: "Scam Detected",
            next_reply: aiReply,
            extracted_intelligence: {
                upi_ids: upis,
                bank_accounts: accounts,
                phishing_links: links
            }
        });

    } catch (err) {
        console.error("🔥 Error caught:", err.message);
        res.status(500).json({ error: "Internal Error", details: err.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running"));
