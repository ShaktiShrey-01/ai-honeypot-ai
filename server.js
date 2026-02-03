require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

// Initialize AI carefully
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.error("❌ ERROR: GEMINI_API_KEY is missing!");
const genAI = new GoogleGenerativeAI(apiKey);

app.post('/api/honeypot', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "No message provided" });

        // 1. Simple Intelligence Extraction
        const upis = message.match(/[a-zA-Z0-9.\-_]+@\w+/g) || [];

        // 2. AI Logic with Safety Catch
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(`Act as Mrs. Lakshmi, reply to: ${message}`);
        const aiReply = result.response.text();

        // 3. Success Response
        res.status(200).json({
            classification: "Scam Detected",
            next_reply: aiReply,
            extracted_intelligence: { upi_ids: upis, bank_accounts: [], phishing_links: [] }
        });

    } catch (err) {
        // THIS CATCHES THE 500 ERROR AND TELLS YOU WHY
        console.error("🔥 Server Crash:", err.message);
        res.status(500).json({ 
            error: "Deep Error Detected", 
            details: err.message,
            hint: "Check if your API Key is correctly added to Render Environment Variables."
        });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running"));
