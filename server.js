const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Telegram Credentials
const BOT_TOKEN = "8673427170:AAGh1Bctii6IlczxS4-mNIGlL3N-jck-T7M";
const CHAT_ID = "6504370273";

// Root Route check karne ke liye ke server live hai ya nahi
app.get('/', (req, res) => {
    res.json({ status: "NEXUS PRO Backend is running live! 🚀" });
});

// Telegram Message Relay Endpoint (CORS bypass & secure)
app.post('/api/send-telegram', async (req, res) => {
    try {
        const { text, buttons } = req.body;

        if (!text) {
            return res.status(400).json({ success: false, error: "Text message is required" });
        }

        const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const payload = {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: buttons || []
            }
        };

        // Node.js built-in fetch (Supported in Node 18+)
        const response = await fetch(telegramUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.ok) {
            return res.json({ success: true, message: "Message sent to Telegram successfully!" });
        } else {
            console.error("Telegram API Error:", data);
            return res.status(400).json({ success: false, error: data });
        }

    } catch (error) {
        console.error("Backend Server Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Server Listen (Vercel ke liye automatic export bhi handle hojata hai)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
