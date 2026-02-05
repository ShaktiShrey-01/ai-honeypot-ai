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
    if (incomingKey !== MY_SECRET_KEY) return res.status(401).json({ error: "Unauthorized" });

    try {
        let scammerText = "";
        const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        if (data?.message?.text) scammerText = data.message.text;
        else if (data?.text) scammerText = data.text;
        else scammerText = "Hello?";

        let aiReply = "";
        
        try {
            // Updated to the most stable model string
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            const prompt = `Act as Raju, a suspicious man. The person says: "${scammerText}". 
            Rules: 
            1. Be very confrontational. 
            2. If they name a branch, tell them you are going there right now to meet them. 
            3. Ask for their Employee ID. 
            4. Max 25 words. No Markdown. 
            5. Gender-neutral: use "Friend" or "you". No Bhai/Sir/Ji/Madam.`;

            const result = await model.generateContent(prompt);
            aiReply = result.response.text().trim().replace(/\*/g, '');
        } catch (aiErr) {
            // MOCK FAILSAFE: If Gemini fails, Raju still fights back!
            const fallbacks = [
                "Friend, I don't believe you. Give me your Employee ID right now.",
                "If you are at that branch, stay there. I am coming with the police now.",
                "I am calling the main manager. What did you say your name was?",
                "My mobile is fine. Your story is fake. Which desk are you sitting at?"
            ];
            aiReply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        res.status(200).json({ status: "success", reply: aiReply });

    } catch (err) {
        // Ultimate fallback - making it look like a real person being difficult
        res.status(200).json({ 
            status: "success", 
            reply: "Listen, friend. I don't give details on the phone. Who is your supervisor?" 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 System Live on port ${PORT}`));
