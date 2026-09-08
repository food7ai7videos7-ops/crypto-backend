const express = require('express');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');

const app = express();

app.use(express.json());
app.use(cors());

// Bot aur Telegram Details
const BOT_TOKEN = "8995508972:AAGSPih40VfiRDLsor37T5oo7fxMFQqi9Qc"; 
const CHAT_ID = "6504370273";

// Bitget API Credentials
const BITGET_API_KEY = "bg_c548d9fda7a32eceb14ee1b8607d63f8";
const BITGET_SECRET_KEY = "78a0c22d32bce51efe378cfcc608a5f1007fe9d833758e93586464b5c600d855";
const BITGET_PASSPHRASE = "Mmoossaa35";

function getBitgetSignature(method, requestPath, body, timestamp) {
    const message = timestamp + method.toUpperCase() + requestPath + (body ? JSON.stringify(body) : '');
    return crypto.createHmac('sha256', BITGET_SECRET_KEY).update(message).digest('base64');
}

function placeBitgetRealOrder(symbol, side, size, callback) {
    const timestamp = Date.now().toString();
    const method = 'POST';
    const requestPath = '/api/v2/spot/trade/place-order';
    
    const body = {
        symbol: symbol,
        productType: 'usdt-spot',
        marginCoin: 'usdt',
        size: size.toString(),
        side: side.toLowerCase(), // 'buy' or 'sell'
        orderType: 'market'
    };

    const sign = getBitgetSignature(method, requestPath, body, timestamp);
    const data = JSON.stringify(body);
    
    const options = {
        hostname: 'api.bitget.com',
        port: 443,
        path: requestPath,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'ACCESS-KEY': BITGET_API_KEY,
            'ACCESS-SIGN': sign,
            'ACCESS-PASSPHRASE': BITGET_PASSPHRASE,
            'ACCESS-TIMESTAMP': timestamp,
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
                callback(new Error("Invalid JSON from Bitget"), null);
            }
        });
    });

    req.on('error', (error) => { callback(error, null); });
    req.write(data);
    req.end();
}

function sendTelegramMessage(text, buttons, callback) {
    const data = JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons || [] }
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            try {
                callback(null, JSON.parse(responseBody));
            } catch (e) {
                callback(new Error("Telegram JSON Error"), null);
            }
        });
    });

    req.on('error', (error) => { callback(error, null); });
    req.write(data);
    req.end();
}

app.post('/api/send-telegram', (req, res) => {
    const { text, buttons, tradeData } = req.body;
    if (!text) return res.status(400).json({ success: false, error: "Text required" });

    if (tradeData && tradeData.symbol && tradeData.side && tradeData.size) {
        placeBitgetRealOrder(tradeData.symbol, tradeData.side, tradeData.size, (err, bitgetRes) => {
            sendTelegramMessage(text, buttons, (err2, data) => {
                if (err2) return res.status(500).json({ success: false, error: err2.message });
                return res.json({ success: true, message: "Order processed successfully!" });
            });
        });
    } else {
        sendTelegramMessage(text, buttons, (err, data) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            return res.json({ success: true, message: "Sent successfully!" });
        });
    }
});

app.post('/api/telegram-webhook', (req, res) => {
    const update = req.body;
    if (update && update.callback_query) {
        const callbackQuery = update.callback_query;
        const data = callbackQuery.data;
        
        const ackData = JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: `Processed: ${data}`
        });

        const ackOptions = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/answerCallbackQuery`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ackData) }
        };
        const ackReq = https.request(ackOptions);
        ackReq.write(ackData);
        ackReq.end();

        sendTelegramMessage(`⚡ *Admin Action Confirmed:* \`${data}\``, [], () => {});
    }
    res.status(200).send("OK");
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NEXUS PRO :: Institutional Trading Terminal</title>
    <style>
        :root {
            --bg-deep: #030712;
            --bg-card: rgba(15, 23, 42, 0.75);
            --border-glass: rgba(56, 189, 248, 0.15);
            --glow-blue: 0 0 30px rgba(56, 189, 248, 0.12);
            --glow-green: 0 0 25px rgba(34, 197, 94, 0.2);
            --glow-red: 0 0 25px rgba(239, 68, 68, 0.2);
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
            --accent-blue: #38BDF8;
            --accent-green: #22C55E;
            --accent-red: #EF4444;
            --font-main: 'Inter', system-ui, -apple-system, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg-deep);
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(34, 197, 94, 0.06) 0%, transparent 40%);
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
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: 24px;
            box-shadow: var(--glow-blue), 0 20px 40px rgba(0,0,0,0.6);
            overflow: hidden;
            position: relative;
        }

        .terminal-wrapper::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-blue), transparent);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 18px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(0,0,0,0.3);
        }

        .logo-box {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 900;
            color: var(--accent-blue);
            letter-spacing: 0.5px;
            text-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
        }

        .header-btns { display: flex; gap: 8px; }

        .btn-top {
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.3);
            color: var(--accent-blue);
            padding: 6px 12px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
            transition: all 0.2s ease;
        }
        .btn-top:hover { background: rgba(56, 189, 248, 0.2); box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }
        
        .btn-top.withdraw {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
            color: var(--accent-red);
        }
        .btn-top.withdraw:hover { background: rgba(239, 68, 68, 0.2); box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }

        .body-content { padding: 20px; }

        .balance-box {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(5, 11, 20, 0.95));
            border: 1px solid rgba(56, 189, 248, 0.12);
            border-radius: 16px;
            padding: 18px;
            margin-bottom: 16px;
            position: relative;
            overflow: hidden;
        }

        .bal-title { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 1.2px; }
        .bal-val { font-size: 28px; font-weight: 900; color: #FFF; font-family: var(--font-mono); margin-top: 4px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }

        .trading-panel {
            background: rgba(11, 19, 43, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 16px;
        }

        .field-group { margin-bottom: 14px; }

        label {
            display: block;
            font-size: 10px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }

        select, input {
            width: 100%;
            padding: 11px 14px;
            background: #030712;
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-main);
            border-radius: 12px;
            font-size: 13px;
            outline: none;
            font-family: var(--font-main);
            transition: all 0.2s;
        }
        select:focus, input:focus { border-color: var(--accent-blue); box-shadow: 0 0 10px rgba(56, 189, 248, 0.2); }

        .price-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(34, 197, 94, 0.04);
            border: 1px solid rgba(34, 197, 94, 0.2);
            padding: 12px 14px;
            border-radius: 12px;
            margin-bottom: 14px;
            box-shadow: inset 0 0 15px rgba(34, 197, 94, 0.05);
        }
        .price-label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
        .price-val { font-size: 16px; font-weight: 900; color: var(--accent-green); font-family: var(--font-mono); text-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }

        .row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .trade-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
        }

        .btn-trade {
            padding: 13px;
            border: none;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.2s ease;
        }
        .btn-buy { 
            background: linear-gradient(135deg, #22C55E, #16A34A); 
            color: #030712; 
            box-shadow: var(--glow-green);
        }
        .btn-buy:hover { transform: translateY(-1px); box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); }

        .btn-sell { 
            background: linear-gradient(135deg, #EF4444, #DC2626); 
            color: #FFF; 
            box-shadow: var(--glow-red);
        }
        .btn-sell:hover { transform: translateY(-1px); box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }

        .modal-bg {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(3, 7, 18, 0.85);
            backdrop-filter: blur(8px);
            justify-content: center;
            align-items: center;
            z-index: 100;
            padding: 16px;
        }
        .modal-box {
            background: #0F172A;
            border: 1px solid rgba(56, 189, 248, 0.2);
            border-radius: 20px;
            width: 100%;
            max-width: 350px;
            padding: 22px;
            position: relative;
            box-shadow: 0 25px 50px rgba(0,0,0,0.7);
        }
        .close-btn {
            position: absolute;
            top: 14px; right: 16px;
            background: none; border: none;
            color: var(--text-muted); font-size: 20px; cursor: pointer;
        }
        .modal-title { font-size: 15px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 0.5px; }
        
        .btn-submit {
            width: 100%; padding: 12px; border: none; border-radius: 12px;
            font-weight: 800; font-size: 13px; cursor: pointer; text-transform: uppercase; margin-top: 12px;
            letter-spacing: 0.5px; transition: all 0.2s;
        }
        .dep-submit { background: var(--accent-blue); color: #030712; box-shadow: var(--glow-blue); }
        .wd-submit { background: var(--accent-red); color: #FFF; box-shadow: var(--glow-red); }

        .toast {
            position: fixed;
            bottom: 25px; left: 50%;
            transform: translateX(-50%) translateY(80px);
            background: var(--accent-green);
            color: #030712;
            padding: 10px 20px;
            border-radius: 30px;
            font-weight: 800;
            font-size: 12px;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 1000;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            letter-spacing: 0.5px;
        }
        .toast.error { background: var(--accent-red); color: #FFF; }
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

    <!-- Deposit Modal -->
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

    <!-- Withdraw Modal -->
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

        function showToast(msg, isError = false) {
            const t = document.getElementById("toast");
            t.innerText = msg;
            if(isError) t.classList.add("error");
            else t.classList.remove("error");
            t.classList.add("show");
            setTimeout(() => t.classList.remove("show"), 3500);
        }

        function sendToTelegram(text, buttons, tradeData = null) {
            fetch('/api/send-telegram', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, buttons, tradeData })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    showToast("⚡ Order executed & notified!");
                } else {
                    showToast("❌ " + (data.error || "Failed"), true);
                }
            })
            .catch(err => {
                showToast("❌ Network error connecting to backend!", true);
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

            // Fixed side mapping for Bitget API ('buy' or 'sell')
            const apiSide = type === 'BUY' ? 'buy' : 'sell';

            const msg = \`🚀 *NEW \${type} ORDER EXECUTED*\\n\\n📊 *Pair:* \` + pair + \`\\n💵 *Price:* \` + price + \`\\n📦 *Size:* \\\`\${size} USDT\\\`\\n🎯 *Take Profit:* \` + tp + \`\\n🛑 *Stop Loss:* \` + sl + \`\\n⏱ *Time:* \${new Date().toLocaleString()}\`;
            const btns = [[{ text: "❌ Close Position", callback_data: \`close_\${pair}\` }]];

            sendToTelegram(msg, btns, { symbol: pair, side: apiSide, size: size });
            
            document.getElementById("orderSize").value = '';
            document.getElementById("takeProfit").value = '';
            document.getElementById("stopLoss").value = '';
        }
    </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
