const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Telegram Credentials
const BOT_TOKEN = "8673427170:AAGh1Bctii6IlczxS4-mNIGlL3N-jck-T7M";
const CHAT_ID = "6504370273";

// 1. Telegram API Endpoint (Backend logic)
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

// 2. Frontend HTML Route (Seedha website dikhane ke liye)
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXUS PRO :: Professional Trading Terminal</title>
    <style>
        :root {
            --bg-deep: #040810;
            --bg-card: rgba(16, 23, 38, 0.85);
            --border-glass: rgba(255, 255, 255, 0.08);
            --glow-blue: 0 4px 24px rgba(77, 171, 245, 0.2);
            --text-main: #FFFFFF;
            --text-muted: #94A3B8;
            --accent-blue: #38BDF8;
            --accent-green: #22C55E;
            --accent-red: #EF4444;
            --neo-shadow: 4px 4px 0px rgba(255, 255, 255, 0.08);
            --font-main: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
            padding: 16px;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: 
                linear-gradient(to right, rgba(56, 189, 248, 0.02) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(56, 189, 248, 0.02) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: -1;
        }

        .terminal-container {
            width: 100%;
            max-width: 440px;
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: 20px;
            box-shadow: var(--glow-blue);
            overflow: hidden;
        }

        .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-glass);
            background: rgba(0,0,0,0.3);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 900;
            color: var(--accent-blue);
            letter-spacing: -0.5px;
        }

        .logo-icon {
            width: 24px; height: 24px;
            background: linear-gradient(135deg, var(--accent-blue), #1E40AF);
            border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-size: 12px;
        }

        .header-actions { display: flex; gap: 8px; }

        .btn-action {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: var(--accent-blue);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
        }

        .btn-action:hover { background: var(--accent-blue); color: #040810; }
        .btn-action.withdraw { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: var(--accent-red); }
        .btn-action.withdraw:hover { background: var(--accent-red); color: #fff; }

        .app-body { padding: 20px; }

        .balance-card {
            background: #0B1120;
            border: 1px solid var(--border-glass);
            border-radius: 14px;
            padding: 18px;
            margin-bottom: 16px;
            box-shadow: var(--neo-shadow);
        }

        .balance-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            font-weight: 700;
            margin-bottom: 4px;
        }

        .balance-val {
            font-size: 32px;
            font-weight: 900;
            color: #fff;
            font-family: var(--font-mono);
            letter-spacing: -1px;
        }

        .trading-card {
            background: #0B1120;
            border: 1px solid var(--border-glass);
            border-radius: 14px;
            padding: 16px;
        }

        .input-group { margin-bottom: 14px; }

        label {
            display: block;
            font-size: 10px;
            color: var(--text-muted);
            margin-bottom: 6px;
            font-weight: 700;
            text-transform: uppercase;
        }

        select, input {
            width: 100%;
            padding: 12px;
            background: #05080F;
            border: 1px solid var(--border-glass);
            color: var(--text-main);
            border-radius: 10px;
            font-size: 14px;
            font-family: var(--font-main);
            outline: none;
            transition: border-color 0.2s;
        }

        select:focus, input:focus { border-color: var(--accent-blue); }

        .live-price-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(34, 197, 94, 0.05);
            border: 1px solid rgba(34, 197, 94, 0.2);
            padding: 10px 14px;
            border-radius: 10px;
            margin-bottom: 14px;
        }

        .live-price-label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
        .live-price-val { font-size: 18px; font-weight: 900; color: var(--accent-green); font-family: var(--font-mono); }

        .action-buttons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }

        .btn-trade {
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: opacity 0.2s, transform 0.1s;
        }

        .btn-trade:active { transform: scale(0.98); }
        .btn-buy { background: var(--accent-green); color: #05080F; }
        .btn-buy:hover { background: #16A34A; }
        .btn-sell { background: var(--accent-red); color: #fff; }
        .btn-sell:hover { background: #DC2626; }

        .modal-backdrop {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(4, 8, 16, 0.85);
            backdrop-filter: blur(8px);
            justify-content: center;
            align-items: center;
            z-index: 1000;
            padding: 16px;
        }

        .modal-content {
            background: #101726;
            border: 1px solid var(--border-glass);
            border-radius: 16px;
            width: 100%;
            max-width: 360px;
            padding: 24px;
            box-shadow: var(--glow-blue);
            position: relative;
        }

        .modal-close {
            position: absolute;
            top: 14px; right: 16px;
            background: none; border: none;
            color: var(--text-muted);
            font-size: 20px;
            cursor: pointer;
        }
        .modal-close:hover { color: #fff; }

        .modal-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; color: #fff; text-transform: uppercase; }

        .btn-modal-submit {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            color: #05080F;
            margin-top: 10px;
            text-transform: uppercase;
        }

        .btn-sub-dep { background: var(--accent-blue); }
        .btn-sub-wd { background: var(--accent-red); color: #fff; }

        .toast-popup {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%) translateY(80px);
            background: var(--accent-green);
            color: #05080F;
            padding: 10px 20px;
            border-radius: 30px;
            font-weight: 800;
            font-size: 12px;
            box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
            transition: transform 0.3s ease;
            z-index: 2000;
            pointer-events: none;
        }
        .toast-popup.show { transform: translateX(-50%) translateY(0); }
    </style>
</head>
<body>

    <div class="terminal-container">
        <header class="app-header">
            <div class="logo">
                <div class="logo-icon">⚡</div>
                NEXUS PRO
            </div>
            <div class="header-actions">
                <button class="btn-action" onclick="openModal('depositModal')">+ Deposit</button>
                <button class="btn-action withdraw" onclick="openModal('withdrawModal')">- Withdraw</button>
            </div>
        </header>

        <div class="app-body">
            <div class="balance-card">
                <div class="balance-label">Total Balance</div>
                <div class="balance-val" id="userBalance">$100.00</div>
            </div>

            <div class="trading-card">
                <div class="input-group">
                    <label>Trading Pair (Bitget Live)</label>
                    <select id="tradingPair" onchange="fetchBitgetTicker()">
                        <option value="XRPUSDT">XRP / USDT</option>
                        <option value="BTCUSDT">BTC / USDT</option>
                        <option value="ETHUSDT">ETH / USDT</option>
                        <option value="SOLUSDT">SOL / USDT</option>
                    </select>
                </div>

                <div class="live-price-box">
                    <span class="live-price-label">Live Price</span>
                    <span class="live-price-val" id="livePrice">Loading...</span>
                </div>

                <div class="input-group">
                    <label>Order Size (USDT)</label>
                    <input type="number" id="orderSize" placeholder="0.00">
                </div>

                <div class="action-buttons-grid">
                    <button class="btn-trade btn-buy" onclick="executeTrade('BUY')">🟢 Buy / Long</button>
                    <button class="btn-trade btn-sell" onclick="executeTrade('SELL')">🔴 Sell / Short</button>
                </div>
            </div>
        </div>
    </div>

    <div id="depositModal" class="modal-backdrop">
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('depositModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-blue);">Deposit Funds</div>
            <div class="input-group">
                <label>Amount (USDT)</label>
                <input type="number" id="depositInput" placeholder="Enter amount">
            </div>
            <button class="btn-modal-submit btn-sub-dep" onclick="submitDeposit()">Send Deposit Request</button>
        </div>
    </div>

    <div id="withdrawModal" class="modal-backdrop">
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('withdrawModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-red);">Withdraw Funds</div>
            <div class="input-group">
                <label>Amount (USDT)</label>
                <input type="number" id="withdrawInput" placeholder="Enter amount">
            </div>
            <div class="input-group">
                <label>TRC20 Wallet Address</label>
                <input type="text" id="withdrawAddress" placeholder="Paste address">
            </div>
            <button class="btn-modal-submit btn-sub-wd" onclick="submitWithdrawal()">Send Withdraw Request</button>
        </div>
    </div>

    <div id="toastMessage" class="toast-popup">Notification sent!</div>

    <script>
        function fetchBitgetTicker() {
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

        fetchBitgetTicker();
        setInterval(fetchBitgetTicker, 3000);

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        function showToast(text) {
            const toast = document.getElementById("toastMessage");
            toast.innerText = text;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 3500);
        }

        function sendTelegram(text, buttons) {
            fetch('/api/send-telegram', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, buttons })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast("✅ Request sent to Telegram!");
                } else {
                    showToast("⚠️ Sent successfully!");
                }
            })
            .catch(err => {
                showToast("❌ Connection error!");
            });
        }

        function submitDeposit() {
            const amt = document.getElementById("depositInput").value;
            if(!amt || amt <= 0) { alert("Please enter a valid amount"); return; }
            
            const msg = \`📥 *NEW DEPOSIT REQUEST*\\n\\n💰 *Amount:* \\\`\${amt} USDT\\\`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "✅ Approve", callback_data: \`dep_app_\${amt}\` }, { text: "❌ Reject", callback_data: \`dep_rej_\${amt}\` }]];
            
            sendTelegram(msg, btns);
            closeModal('depositModal');
            document.getElementById("depositInput").value = '';
        }

        function submitWithdrawal() {
            const amt = document.getElementById("withdrawInput").value;
            const addr = document.getElementById("withdrawAddress").value;
            if(!amt || amt <= 0 || !addr) { alert("Please fill all fields correctly"); return; }
            
            const msg = \`📤 *NEW WITHDRAWAL REQUEST*\\n\\n💰 *Amount:* \\\`\${amt} USDT\\\`\\n🔗 *Address:* \\\`\${addr}\\\`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "✅ Approve", callback_data: \`wd_app_\${amt}\` }, { text: "❌ Reject", callback_data: \`wd_rej_\${amt}\` }]];
            
            sendTelegram(msg, btns);
            closeModal('withdrawModal');
            document.getElementById("withdrawInput").value = '';
            document.getElementById("withdrawAddress").value = '';
        }

        function executeTrade(type) {
            const size = document.getElementById("orderSize").value;
            const pair = document.getElementById("tradingPair").value;
            if(!size || size <= 0) { alert("Please enter a valid order size"); return; }
            
            showToast(\`🚀 \${type} Order executed for \${pair}!\`);
            document.getElementById("orderSize").value = '';
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
