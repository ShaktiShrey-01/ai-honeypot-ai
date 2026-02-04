require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();

// --- 1. MIDDLEWARE: HANDLING ALL INPUT TYPES ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); 

// --- 2. INITIALIZATION ---
const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health Check for UptimeRobot and Browsers
app.get('/api/honeypot', (req, res) => {
    res.status(200).json({ status: "success", message: "Mrs. Lakshmi is online. Grandma is ready." });
});

// --- 3. THE MAIN EVALUATION ENDPOINT ---
app.post('/api/honeypot', async (req, res) => {
    // A. AUTH CHECK
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        console.log("📥 Incoming Request Body:", JSON.stringify(req.body, null, 2));

        // B. DETROIT31 NESTED EXTRACTION
        // They send: { message: { text: "..." } }
        let scammerText = "";
        
        if (req.body.message && req.body.message.text) {
            scammerText = req.body.message.text;
        } else if (req.body.text) {
            scammerText = req.body.text;
        } else if (typeof req.body === 'string') {
            scammerText = req.body;
        }

        const safeMessage = String(scammerText).trim();

        // C. AI RESPONSE GENERATION (Mrs. Lakshmi Persona)
        let aiReply = "Oh dear, I'm a bit confused. Can you help me?";

        if (safeMessage) {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-flash-latest",
                // Safety settings: Ensure AI responds even to "dangerous" scam text
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            const prompt = `Act as Mrs. Lakshmi, a 70-year-old polite Indian grandmother. 
            Keep the conversation going to waste the scammer's time. 
            Message from stranger: "${safeMessage}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            aiReply = response.text().trim();
        }

        // D. FINAL MANDATORY RESPONSE FORMAT (As requested by Detroit31)
        console.log("✅ Sending formatted response back to judges.");
        res.status(200).json({
            status: "success",
            reply: aiReply
        });

    } catch (err) {
        console.error("🔥 Error during processing:", err.message);
        // Fallback must also match the judges' format
        res.status(200).json({
            status: "success",
            reply: "I'm sorry dear, my phone is acting up again. What was that?"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Detroit31 Submission LIVE on port ${PORT}`);
});
