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

// Health Check (Root and API GET)
app.get('/', (req, res) => res.status(200).send("Raju is online. 🏃‍♂️"));
app.get('/api/honeypot', (req, res) => {
    res.status(200).json({ status: "success", message: "Raju is active and responding." });
});

// --- 3. THE MAIN EVALUATION ENDPOINT ---
app.post('/api/honeypot', async (req, res) => {
    // A. AUTH CHECK
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        console.log("📥 Incoming Request:", JSON.stringify(req.body, null, 2));

        // B. NESTED EXTRACTION (Handles Detroit31 format)
        let scammerText = "";
        if (req.body.message && req.body.message.text) {
            scammerText = req.body.message.text;
        } else if (req.body.text) {
            scammerText = req.body.text;
        } else if (typeof req.body === 'string') {
            scammerText = req.body;
        }

        const safeMessage = String(scammerText).trim();

        // C. AI RESPONSE GENERATION (Raju Persona)
        let aiReply = "Hello? Who is this? I am a bit busy right now.";

        if (safeMessage) {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            // RAJU PERSONA PROMPT
            const prompt = `
    Act as Raju, a common Indian man who is suspicious but acting scared. 
    Your goal is to waste the scammer's time by CONFRONTING them with questions.

    Rules for Raju's Confrontation:
    1. Challenge their authority: Ask "What is your Employee ID?" or "If you are from bank, why are you calling from a mobile number?"
    2. Ask for proof: "Which branch do I have my account in? Tell me the branch name first."
    3. Use 'Bhai' and 'Boss' but sound annoyed: "Bhai, last time also one person called and he was a fraud. How do I know you are real?"
    4. Divert with logic: "My brother works in police, should I ask him to check this for me?"
    
    Message from stranger: "${safeMessage}"
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiReply = response.text().trim();
        }

        // D. FINAL MANDATORY RESPONSE FORMAT
        res.status(200).json({
            status: "success",
            reply: aiReply
        });

    } catch (err) {
        console.error("🔥 Error:", err.message);
        res.status(200).json({
            status: "success",
            reply: "Bhai, signal is weak. Can you repeat what you said?"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Raju Honeypot LIVE on port ${PORT}`);
});
