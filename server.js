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
    // 1. LOG THE REQUEST
    console.log("📥 Incoming Message:", req.body && req.body.message);
    try {
        const { message } = req.body || {};
        if (!message) return res.status(400).json({ error: "No message provided" });

        // 2. TEST THE KEY
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("API KEY IS MISSING IN ENVIRONMENT VARIABLES");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // 3. ATTEMPT AI CALL
        const result = await model.generateContent(`Act as a victim: ${message}`);
        const response = await result.response;
        const aiReply = response.text();

        console.log("✅ AI Success:", aiReply);

        res.status(200).json({
            classification: "Scam Detected",
            next_reply: aiReply,
            extracted_intelligence: { upi_ids: [], bank_accounts: [], phishing_links: [] }
        });

    } catch (err) {
        // Return detailed error for diagnostics
        console.log("❌ DETAILED ERROR:", err.stack);
        res.status(500).json({
            error: "Logic Error",
            message: err.message,
            stack: err.stack
        });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Server Running"));
