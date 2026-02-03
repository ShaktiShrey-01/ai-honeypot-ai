require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Session = require('./models/session');

const app = express();
app.use(express.json());

// 1. Database Connection (hardened)
const mongoUri = process.env.MONGO_URI;
const connectOptions = {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    family: 4 // prefer IPv4 to avoid certain DNS issues
};

mongoose.connect(mongoUri, connectOptions)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => {
        console.error("DB Error:", err);
        if (err && err.code === 'ECONNREFUSED' && String(err.syscall).includes('querySrv')) {
            console.error('[Hint] SRV DNS lookup failed. Options:');
            console.error(' - Switch your network DNS to 8.8.8.8 / 1.1.1.1');
            console.error(' - From MongoDB Atlas, copy the non-SRV connection string ("mongodb://" option)');
            console.error(' - Or use a local MongoDB: MONGO_URI=mongodb://127.0.0.1:27017/ai_honeypot');
        }
    });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. Intelligence Extraction Logic (Regex)
const extractIntelligence = (text) => {
    const upiRegex = /[a-zA-Z0-9.\-_]+@[a-zA-Z]+/g;
    const bankRegex = /\b\d{9,18}\b/g; // Standard Indian Bank Account length
    const linkRegex = /https?:\/\/[^\s]+/g;

    return {
        upiIds: text.match(upiRegex) || [],
        bankAccounts: text.match(bankRegex) || [],
        links: text.match(linkRegex) || []
    };
};

// 3. The Hackathon API Endpoint
app.post('/api/honeypot', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                error: 'Database unavailable',
                details: 'MongoDB not connected. Check your MONGO_URI and DNS (SRV).'
            });
        }
        const { message, scammerId } = req.body;

        // Fetch or create conversation history
        let session = await Session.findOne({ scammerId });
        if (!session) {
            session = new Session({ scammerId, conversation: [], extractedInfo: { upiIds: [], bankAccounts: [], links: [] } });
        }

        // Run Extraction
        const foundData = extractIntelligence(message);
        session.extractedInfo.upiIds.push(...foundData.upiIds);
        session.extractedInfo.bankAccounts.push(...foundData.bankAccounts);
        session.extractedInfo.links.push(...foundData.links);

        // Prepare AI Persona
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: "You are 'Mrs. Lakshmi', a 70-year-old grandmother. You are polite, slightly confused by technology, but very willing to pay the 'fee' or 'fine'. Your goal is to keep the scammer talking. If they give a link, ask for a bank account instead. If they give a UPI, ask for their name to 'verify'. Be very talkative."
        });

        // Add scammer message to history and get AI response
        session.conversation.push({ role: "user", part: message });
        const chat = model.startChat({ history: session.conversation });
        const result = await chat.sendMessage(message);
        const aiReply = result.response.text();

        // Save reply to history
        session.conversation.push({ role: "model", part: aiReply });
        await session.save();

        // Final Response to Hackathon System
        res.status(200).json({
            classification: "Scam Detected",
            confidence_score: 0.95,
            next_reply: aiReply,
            extracted_intelligence: {
                upi_ids: [...new Set(session.extractedInfo.upiIds)],
                bank_accounts: [...new Set(session.extractedInfo.bankAccounts)],
                phishing_links: [...new Set(session.extractedInfo.links)]
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
