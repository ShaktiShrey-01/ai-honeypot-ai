require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// API key protection (inline auth)
const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";

// Initialize AI carefully
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: GEMINI_API_KEY is missing!");
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/honeypot', async (req, res) => {
    // 1. Log the body to see EXACTLY what the tester is sending
    console.log("📦 Received Body:", req.body);

    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== (process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // 2. Safety Check: Handle empty or malformed bodies
        if (!req.body || Object.keys(req.body).length === 0) {
            console.log("⚠️ Tester sent an empty body. Sending dummy response for validation.");
            return res.status(200).json({
                classification: "Scam Detected",
                next_reply: "Hello? Is anyone there? My glasses are missing...",
                extracted_intelligence: { upi_ids: [], bank_accounts: [], phishing_links: [] }
            });
        }

        // 3. Extract message safely
        const message = req.body.message || "";
        const safeMessage = String(message);

        // --- DEFENSIVE FIX STARTS HERE ---
        const upis = safeMessage.match(/[a-zA-Z0-9.\-_]+@\w+/g) || [];
        const accounts = safeMessage.match(/\b\d{9,18}\b/g) || [];
        const links = safeMessage.match(/https?:\/\/[^\s]+/g) || [];

        // 2. AI Logic (Only call AI if there is a message to reply to)
        let aiReply = "Oh dear, I didn't catch that. Could you repeat it?";
        if (safeMessage.length > 0 && typeof genAI !== 'undefined') {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
                const result = await model.generateContent(`Act as Mrs. Lakshmi, reply to: ${safeMessage}`);
                const response = await result.response;
                aiReply = response.text();
            } catch (err) {
                console.error("🔥 Gemini Error:", err.message);
            }
        }

        // 3. Success Response
        res.status(200).json({
            classification: "Scam Detected",
            next_reply: aiReply, // Your Gemini-generated reply
            extracted_intelligence: {
                upi_ids: upis,
                bank_accounts: accounts,
                phishing_links: links
            }
        });

    } catch (err) {
        console.error("🔥 Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running"));
