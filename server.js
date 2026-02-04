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
    // 1. Auth Check
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // 2. CRITICAL FIX: Safe Extraction
        // We look for req.body.message.text because that's what the hackathon sends
        let scammerText = "";
        
        if (req.body && req.body.message && req.body.message.text) {
            scammerText = req.body.message.text;
        } else if (req.body && req.body.text) {
            scammerText = req.body.text;
        } else {
            // Fallback if the body is just a string
            scammerText = typeof req.body === 'string' ? req.body : "";
        }

        // 3. If it's still empty, don't crash—give a default Raju reply
        if (!scammerText || scammerText.trim() === "") {
            return res.status(200).json({
                status: "success",
                reply: "Bhai, what are you saying? I can't hear you clearly. Who is this?"
            });
        }

        // C. AI RESPONSE GENERATION (Raju Persona)
        let aiReply = "Hello? Who is this? I am a bit busy right now.";
        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            // RAJU PERSONA PROMPT
            const prompt = `
Act as Raju, a suspicious Indian man. 
Respond to this scam message: "${scammerText}"
1. Be confrontational but brief (max 50 words).
2. Ask for their Employee ID and which specific bank branch they are in.
3. Do not use Markdown (no asterisks **), no blockquotes, and no special characters.
4. Speak in plain English with a few Indian touches like "Bhai" or "Boss".
`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiReply = response.text().trim();
        } catch (err) {
            console.error("Error generating AI reply:", err.message);
        }

        // D. FINAL MANDATORY RESPONSE FORMAT
        res.status(200).json({
            status: "success",
            reply: aiReply // Make sure this is a string
        });

    } catch (err) {
        console.error("Error:", err.message);
        res.status(200).json({
            status: "success",
            reply: "Boss, my phone is hanging. Call me back in 5 minutes."
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Raju Honeypot LIVE on port ${PORT}`);
});
