require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();

// --- 1. MIDDLEWARE: The order here prevents "Invalid Body" errors ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); 

const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => res.status(200).send("System Online."));

// --- 2. THE MAIN ENDPOINT ---
app.post('/api/honeypot', async (req, res) => {
    // Auth Check
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // Log incoming data for debugging
        console.log("📥 Raw Body:", req.body);

        // 3. BULLETPROOF EXTRACTION
        let scammerText = "";
        
        if (req.body && typeof req.body === 'object') {
            // Check for the Hackathon's nested format first
            if (req.body.message && req.body.message.text) {
                scammerText = req.body.message.text;
            } else if (req.body.text) {
                scammerText = req.body.text;
            }
        } else if (typeof req.body === 'string') {
            scammerText = req.body;
        }

        // 4. PREVENT EMPTY RESPONSE ERROR
        if (!scammerText || String(scammerText).trim() === "") {
            return res.status(200).json({
                status: "success",
                reply: "I am currently in a meeting. Please state your identity and branch name."
            });
        }

        // 5. AI GENERATION (Global Gender-Neutral)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash", // Using stable version string
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
        });

        const prompt = `
            Act as Raju, a suspicious professional busy at work. 
            Respond to: "${scammerText}"
            
            Rules:
            1. Be brief (max 30 words).
            2. Use ONLY gender-neutral terms like "Friend" or "Someone". 
            3. FORBIDDEN: Bhai, Sir, Madam, Officer, Boss, Sister, -ji.
            4. Ask for their Employee ID and their specific bank branch location.
            5. No Markdown (**). Plain text only.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiReply = response.text().trim();

        // 6. FINAL SUCCESS RESPONSE
        res.status(200).json({
            status: "success",
            reply: aiReply
        });

    } catch (err) {
        console.error("🔥 Error:", err.message);
        res.status(200).json({
            status: "success",
            reply: "I cannot talk right now. Which branch are you calling from?"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Live on port ${PORT}`));
