const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Telegram Credentials
const BOT_TOKEN = "8673427170:AAGh1Bctii6IlczxS4-mNIGlL3N-jck-T7M";
const CHAT_ID = "6504370273";

// Helper function to send Telegram message using native HTTPS module
function sendTelegramMessage(text, buttons, callback) {
    const data = JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: buttons || []
        }
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(responseBody);
                callback(null, parsed);
            } catch (e) {
                callback(e, null);
            }
        });
    });

    req.on('error', (error) => {
        callback(error, null);
    });

    req.write(data);
    req.end();
}

// 1. Telegram API Endpoint
app.post('/api/send-telegram', (req, res) => {
    const { text, buttons } = req.body;
    if (!text) {
        return res.status(400).json({ success: false, error: "Text message is required" });
    }

    sendTelegramMessage(text, buttons, (err, data) => {
        if (err) {
            console.error("Telegram Request Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }

        if (data && data.ok) {
            return res.json({ success: true, message: "Message sent to Telegram successfully!" });
        } else {
            console.error("Telegram API Error Response:", data);
            return res.status(400).json({ success: false, error: data });
        }
    });
});

// 2. Frontend HTML Route
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXUS PRO :: Professional Trading Terminal</title>
    <style>
        :root {
            --bg-deep: #07090E;
            --bg-card: #0F172A;
            --border-glass: rgba(255, 255, 255, 0.08);
            --glow-blue: 0 0 25px rgba(56, 189, 248, 0.15);
            --text-main: #F8FAFC;
            --text-muted: #64748B;
            --accent-blue: #38BDF8;
            --accent-green: #22C55E;
            --accent-red: #EF4444;
            --font-main: 'Inter', system-ui, -apple-system, sans-serif;
            --font-mono: 'Roboto Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg-deep);
            color: var(--text-main);
            font-family: var(--font-main);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 12px;
        }

        .terminal-wrapper {
            width: 100%;
            max-width: 420px;
            background: var(--bg-card);
            border: 1px solid var(--border-glass);
            border-radius: 24px;
            box-shadow: var(--glow-blue);
            overflow: hidden;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-glass);
            background: rgba(0,0,0,0.2);
        }

        .logo-box {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 900;
            color: var(--accent-blue);
        }

        .header-btns { display: flex; gap: 8px; }

        .btn-top {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.2);
            color: var(--accent-blue);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
        }
        .btn-top.withdraw {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
            color: var(--accent-red);
        }

        .body-content { padding: 20px; }

        .balance-box {
            background: #0B132B;
            border: 1px solid var(--border-glass);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .bal-title { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
        .bal-val { font-size: 28px; font-weight: 900; color: #FFF; font-family: var(--font-mono); margin-top: 4px; }

        .trading-panel {
            background: #0B132B;
            border: 1px solid var(--border-glass);
            border-radius: 16px;
            padding: 16px;
        }

        .field-group { margin-bottom: 12px; }

        label {
            display: block;
            font-size: 10px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 5px;
        }

        select, input {
            width: 100%;
            padding: 10px 12px;
            background: #050B14;
            border: 1px solid var(--border-glass);
            color: var(--text-main);
            border-radius: 10px;
            font-size: 13px;
            outline: none;
            font-family: var(--font-main);
        }
        select:focus, input:focus { border-color: var(--accent-blue); }

        .price-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(34, 197, 94, 0.05);
            border: 1px solid rgba(34, 197, 94, 0.2);
            padding: 10px 14px;
            border-radius: 10px;
            margin-bottom: 12px;
        }
        .price-label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
        .price-val { font-size: 16px; font-weight: 900; color: var(--accent-green); font-family: var(--font-mono); }

        .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .trade-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 14px;
        }

        .btn-trade {
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            text-transform: uppercase;
        }
        .btn-buy { background: var(--accent-green); color: #050B14; }
        .btn-sell { background: var(--accent-red); color: #FFF; }

        /* Modal styling */
        .modal-bg {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(7, 9, 14, 0.85);
            backdrop-filter: blur(6px);
            justify-content: center;
            align-items: center;
            z-index: 100;
            padding: 16px;
        }
        .modal-box {
            background: #0F172A;
            border: 1px solid var(--border-glass);
            border-radius: 18px;
            width: 100%;
            max-width: 350px;
            padding: 20px;
            position: relative;
        }
        .close-btn {
            position: absolute;
            top: 12px; right: 14px;
            background: none; border: none;
            color: var(--text-muted); font-size: 18px; cursor: pointer;
        }
        .modal-title { font-size: 15px; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; }
        .btn-submit {
            width: 100%; padding: 11px; border: none; border-radius: 10px;
            font-weight: 800; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 10px;
        }
        .dep-submit { background: var(--accent-blue); color: #050B14; }
        .wd-submit { background: var(--accent-red); color: #FFF; }

        /* Toast Popup */
        .toast {
            position: fixed;
            bottom: 20px; left: 50%;
            transform: translateX(-50%) translateY(70px);
            background: var(--accent-green);
            color: #050B14;
            padding: 8px 18px;
            border-radius: 20px;
            font-weight: 800;
            font-size: 12px;
            transition: transform 0.3s ease;
            z-index: 1000;
        }
        .toast.show { transform: translateX(-50%) translateY(0); }
    </style>
</head>
<body>

    <div class="terminal-wrapper">
        <header class="header">
            <div class="logo-box">⚡ NEXUS PRO</div>
            <div class="header-btns">
                <button class="btn-top" onclick="openModal('depositModal')">+ Deposit</button>
                <button class="btn-top withdraw" onclick="openModal('withdrawModal')">- Withdraw</button>
            </div>
        </header>

        <div class="body-content">
            <div class="balance-box">
                <div class="bal-title">Total Account Balance</div>
                <div class="bal-val" id="accBalance">$100.0000</div>
            </div>

            <div class="trading-panel">
                <div class="field-group">
                    <label>Trading Pair (Bitget Live)</label>
                    <select id="tradingPair" onchange="fetchTicker()">
                        <option value="XRPUSDT">XRP / USDT</option>
                        <option value="BTCUSDT">BTC / USDT</option>
                        <option value="ETHUSDT">ETH / USDT</option>
                        <option value="SOLUSDT">SOL / USDT</option>
                    </select>
                </div>

                <div class="price-display">
                    <span class="price-label">Live Market Price</span>
                    <span class="price-val" id="livePrice">Loading...</span>
                </div>

                <div class="field-group">
                    <label>Order Size (USDT)</label>
                    <input type="number" id="orderSize" placeholder="0.00">
                </div>

                <div class="row-inputs">
                    <div class="field-group">
                        <label>Take Profit ($)</label>
                        <input type="number" id="takeProfit" placeholder="Optional">
                    </div>
                    <div class="field-group">
                        <label>Stop Loss ($)</label>
                        <input type="number" id="stopLoss" placeholder="Optional">
                    </div>
                </div>

                <div class="trade-actions">
                    <button class="btn-trade btn-buy" onclick="executeOrder('BUY')">🟢 Buy / Long</button>
                    <button class="btn-trade btn-sell" onclick="executeOrder('SELL')">🔴 Sell / Short</button>
                </div>
            </div>
        </div>
    </div>

    <div id="depositModal" class="modal-bg">
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('depositModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-blue);">Deposit Funds</div>
            <div class="field-group">
                <label>Amount (USDT)</label>
                <input type="number" id="depAmount" placeholder="Enter amount">
            </div>
            <button class="btn-submit dep-submit" onclick="submitDeposit()">Send Deposit Request</button>
        </div>
    </div>

    <div id="withdrawModal" class="modal-bg">
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('withdrawModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-red);">Withdraw Funds</div>
            <div class="field-group">
                <label>Amount (USDT)</label>
                <input type="number" id="wdAmount" placeholder="Enter amount">
            </div>
            <div class="field-group">
                <label>TRC20 Wallet Address</label>
                <input type="text" id="wdAddress" placeholder="Paste TRC20 address">
            </div>
            <button class="btn-submit wd-submit" onclick="submitWithdraw()">Send Withdraw Request</button>
        </div>
    </div>

    <div id="toast" class="toast">Action completed successfully</div>

    <script>
        function fetchTicker() {
            const symbol = document.getElementById("tradingPair").value;
            fetch(\`https://api.bitget.com/api/v2/spot/market/tickers?symbol=\${symbol}\`)
                .then(res => res.json())
                .then(data => {
                    if(data && data.data && data.data.length > 0) {
                        const price = parseFloat(data.data[0].lastPr).toFixed(4);
                        document.getElementById("livePrice").innerText = \`$\${price}\`;
                    }
                })
                .catch(err => console.log("Bitget Error:", err));
        }

        fetchTicker();
        setInterval(fetchTicker, 3000);

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        function showToast(msg) {
            const t = document.getElementById("toast");
            t.innerText = msg;
            t.classList.add("show");
            setTimeout(() => t.classList.remove("show"), 3000);
        }

        function sendToTelegram(text, buttons) {
            fetch('/api/send-telegram', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, buttons })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast("✅ Sent to Telegram successfully!");
                } else {
                    showToast("❌ Failed: " + (data.error?.description || "Check console"));
                }
            })
            .catch(err => {
                showToast("❌ Network error connecting to backend!");
            });
        }

        function submitDeposit() {
            const amt = document.getElementById("depAmount").value;
            if(!amt || amt <= 0) { alert("Enter valid amount"); return; }

            const msg = \`📥 *NEW DEPOSIT REQUEST*\\n\\n💰 *Amount:* \\\`\${amt} USDT\\\`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "✅ Approve", callback_data: \`dep_app_\${amt}\` }, { text: "❌ Reject", callback_data: \`dep_rej_\${amt}\` }]];

            sendToTelegram(msg, btns);
            closeModal('depositModal');
            document.getElementById("depAmount").value = '';
        }

        function submitWithdraw() {
            const amt = document.getElementById("wdAmount").value;
            const addr = document.getElementById("wdAddress").value;
            if(!amt || amt <= 0 || !addr) { alert("Fill all fields correctly"); return; }

            const msg = \`📤 *NEW WITHDRAWAL REQUEST*\\n\\n💰 *Amount:* \\\`\${amt} USDT\\\`\\n🔗 *Address:* \\\`\${addr}\\\`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "✅ Approve", callback_data: \`wd_app_\${amt}\` }, { text: "❌ Reject", callback_data: \`wd_rej_\${amt}\` }]];

            sendToTelegram(msg, btns);
            closeModal('withdrawModal');
            document.getElementById("wdAmount").value = '';
            document.getElementById("wdAddress").value = '';
        }

        function executeOrder(type) {
            const pair = document.getElementById("tradingPair").value;
            const size = document.getElementById("orderSize").value;
            const tp = document.getElementById("takeProfit").value || 'None';
            const sl = document.getElementById("stopLoss").value || 'None';
            const price = document.getElementById("livePrice").innerText;

            if(!size || size <= 0) { alert("Please enter a valid order size"); return; }

            const msg = \`🚀 *NEW \${type} ORDER EXECUTED*\\n\\n📊 *Pair:* \` + pair + \`\\n💵 *Price:* \` + price + \`\\n📦 *Size:* \\\`\${size} USDT\\\`\\n🎯 *Take Profit:* \` + tp + \`\\n🛑 *Stop Loss:* \` + sl + \`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "❌ Close Position", callback_data: \`close_\${pair}\` }]];

            sendToTelegram(msg, btns);
            showToast(\`🚀 \${type} Order Sent to Telegram!\`);
            document.getElementById("orderSize").value = '';
            document.getElementById("takeProfit").value = '';
            document.getElementById("stopLoss").value = '';
        }
    </script>
</body>
</html>`);
});

// Server Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
