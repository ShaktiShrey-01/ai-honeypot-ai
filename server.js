require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Session = require('./models/session');

const app = express();
app.use(express.json());

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log("DB Connected"));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Adaptive Strategy Function (Unique Feature)
const getStrategy = (message) => {
    const urgency = ['now', 'fast', 'police', 'threat', 'court', 'block'].some(w => message.toLowerCase().includes(w));
    return urgency ? "PANIC_MODE" : "CONFUSED_ELDERLY";
};

// 3. API Endpoint Submission (POST /api/honeypot)
app.post('/api/honeypot', async (req, res) => {
    try {
        const { message, scammerId } = req.body;

        // Fetch or Create Session
        let session = await Session.findOne({ scammerId }) || new Session({ scammerId, history: [], intelligence: { upi_ids: [], bank_accounts: [], phishing_links: [] } });

        // Regex Extraction
        const upis = message.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/g) || [];
        const banks = message.match(/\b\d{9,18}\b/g) || [];
        const links = message.match(/https?:\/\/[^\s]+/g) || [];

        session.intelligence.upi_ids.push(...upis);
        session.intelligence.bank_accounts.push(...banks);
        session.intelligence.phishing_links.push(...links);

        // Determine Strategy
        const strategy = getStrategy(message);
        const instruction = strategy === "PANIC_MODE" 
            ? "Act terrified. Beg them not to take action. This keeps them aggressive and revealing info." 
            : "Act like Mrs. Lakshmi, a 70yo who is very talkative about her grandson and 'struggles' to find her glasses.";

        // AI Generation
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `Persona: ${instruction}. Task: Extract bank info.`
        });

        const chat = model.startChat({ history: session.history });
        const result = await chat.sendMessage(message);
        const aiReply = result.response.text();

        // Update History
        session.history.push({ role: "user", parts: [{ text: message }] });
        session.history.push({ role: "model", parts: [{ text: aiReply }] });
        await session.save();

        // Standardized Hackathon Response
        res.json({
            classification: "Scam Detected",
            next_reply: aiReply,
            extracted_intelligence: {
                upi_ids: [...new Set(session.intelligence.upi_ids)],
                bank_accounts: [...new Set(session.intelligence.bank_accounts)],
                phishing_links: [...new Set(session.intelligence.phishing_links)]
            },
            unique_analysis: {
                strategy_used: strategy,
                scammer_urgency: strategy === "PANIC_MODE" ? "High" : "Normal"
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("Honeypot Live!"));
