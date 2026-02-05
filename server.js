require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const app = express();

// --- 1. UPDATED MIDDLEWARE ---
// This ensures we catch the body no matter HOW the hackathon sends it
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: '*/*' })); 

const MY_SECRET_KEY = process.env.HACKATHON_AUTH_KEY || "Buildathon2026Secret";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get('/', (req, res) => res.status(200).send("System Online."));

// --- 2. THE MAIN ENDPOINT ---
// --- 2. UPDATED ENDPOINT ---
app.post('/api/honeypot', async (req, res) => {
    const incomingKey = req.headers['x-api-key'];
    if (incomingKey !== MY_SECRET_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        // Log exactly what the server sees to the Render console
        console.log("📥 Raw Body Type:", typeof req.body);
        console.log("📥 Raw Body Content:", req.body);

        let data = req.body;

        // FIX: If the body arrived as a string, manually parse it
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.log("Not a JSON string, using raw text.");
            }
        }

        // 3. TARGETED EXTRACTION
        let scammerText = "";
        if (data && data.message && data.message.text) {
            scammerText = data.message.text;
        } else if (data && data.text) {
            scammerText = data.text;
        } else if (typeof data === 'string') {
            scammerText = data;
        }

        // 4. PREVENT EMPTY RESPONSES
        if (!scammerText || String(scammerText).trim() === "") {
            return res.status(200).json({
                status: "success",
                reply: "Hello? I am in a meeting. Who is this?"
            });
        }

        // 5. AI GENERATION
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Act as Raju, a suspicious professional. Respond to: "${scammerText}". 
                        Rules: Brief (max 20 words), gender-neutral (use 'Friend'), 
                        ask for Employee ID and Branch. No Markdown. No -ji.`;

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
            reply: "The line is bad. Which branch are you from?"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Live on port ${PORT}`));
