require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();

// --- 1. MIDDLEWARE ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); 

// --- 2. INITIALIZATION ---
const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health Check
app.get('/', (req, res) => res.status(200).send("Raju is online."));
app.get('/api/honeypot', (req, res) => {
    res.status(200).json({ status: "success", message: "System active." });
});

// --- 3. THE MAIN EVALUATION ENDPOINT ---
app.post('/api/honeypot', async (req, res) => {
    // A. AUTH CHECK
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // B. INDESTRUCTIBLE EXTRACTION
        let scammerText = "";
        if (req.body) {
            if (req.body.message && req.body.message.text) {
                scammerText = req.body.message.text;
            } else if (req.body.text) {
                scammerText = req.body.text;
            } else if (typeof req.body === 'string') {
                scammerText = req.body;
            }
        }

        if (!scammerText || String(scammerText).trim() === "") {
            return res.status(200).json({
                status: "success",
                reply: "Hello? I am busy. Who is calling and why?"
            });
        }

        // C. GEMINI AI GENERATION
        let aiReply = "";
        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            const prompt = `
                Act as Raju, a suspicious man busy at work. 
                Respond to this message: "${scammerText}"
                
                Rules:
                1. Be confrontational but very brief (max 30 words).
                2. Use ONLY global gender-neutral terms like "Friend", "User", or "Someone". 
                3. STRICTLY FORBIDDEN: Do not use "Bhai", "Sir", "Madam", "Officer", "Person", "Boss", "Sister", or "-ji".
                4. Ask for their Employee ID and their specific bank branch location.
                5. Do not use any Markdown formatting (no asterisks **). 
                6. Sound annoyed about the interruption.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiReply = response.text().trim();
        } catch (aiErr) {
            aiReply = "Listen, I am working. Provide your ID and branch name immediately.";
        }

        // D. FINAL RESPONSE (Detroit31 Format)
        res.status(200).json({
            status: "success",
            reply: aiReply
        });

    } catch (err) {
        res.status(200).json({
            status: "success",
            reply: "The connection is poor. Which branch are you calling from?"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Raju System LIVE (Global Neutral) on port ${PORT}`);
});
