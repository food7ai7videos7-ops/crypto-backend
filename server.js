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

// Admin Configuration Settings (With Password)
let adminConfig = {
    adminPassword: "Mmooossaa35#",
    feePercent: 0.5,
    adminCryptoWallet: "TRC20_ADMIN_DEFAULT_WALLET_ADDRESS",
    customCoins: [
        { symbol: "XRPUSDT", name: "XRP / USDT" },
        { symbol: "BTCUSDT", name: "BTC / USDT" },
        { symbol: "ETHUSDT", name: "ETH / USDT" },
        { symbol: "SOLUSDT", name: "SOL / USDT" }
    ]
};

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
        side: side.toLowerCase(),
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
                callback(null, JSON.parse(responseBody));
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

app.get('/api/config', (req, res) => {
    // Password hide karke bhejte hain frontend par safety ke liye
    res.json({ 
        success: true, 
        config: {
            feePercent: adminConfig.feePercent,
            adminCryptoWallet: adminConfig.adminCryptoWallet,
            customCoins: adminConfig.customCoins
        } 
    });
});

app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === adminConfig.adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Galat Password!" });
    }
});

app.post('/api/admin/update', (req, res) => {
    const { password, feePercent, adminCryptoWallet, newCoin } = req.body;
    if (password !== adminConfig.adminPassword) {
        return res.status(401).json({ success: false, error: "Unauthorized access!" });
    }

    if (feePercent !== undefined) adminConfig.feePercent = parseFloat(feePercent);
    if (adminCryptoWallet) adminConfig.adminCryptoWallet = adminCryptoWallet;
    if (newCoin && newCoin.symbol && newCoin.name) {
        adminConfig.customCoins.push(newCoin);
    }
    res.json({ 
        success: true, 
        config: {
            feePercent: adminConfig.feePercent,
            adminCryptoWallet: adminConfig.adminCryptoWallet,
            customCoins: adminConfig.customCoins
        } 
    });
});

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

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APEX TRADING :: Professional Terminal</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #050811;
            --bg-card: rgba(13, 19, 33, 0.75);
            --border-neon: rgba(0, 242, 254, 0.15);
            --accent-cyan: #00F2FE;
            --accent-blue: #4FACFE;
            --accent-green: #10B981;
            --accent-red: #EF4444;
            --text-main: #F1F5F9;
            --text-muted: #64748B;
            --font-main: 'Plus Jakarta Sans', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--bg-body);
            background-image: 
                radial-gradient(circle at 10% 10%, rgba(0, 242, 254, 0.06) 0%, transparent 45%),
                radial-gradient(circle at 90% 90%, rgba(16, 185, 129, 0.05) 0%, transparent 45%);
            color: var(--text-main);
            font-family: var(--font-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
        }

        .terminal-container {
            width: 100%;
            max-width: 440px;
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border-neon);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 254, 0.1);
            overflow: hidden;
            position: relative;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(3, 7, 18, 0.6);
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .logo {
            font-size: 16px;
            font-weight: 800;
            background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 0.5px;
        }

        .nav-buttons { display: flex; gap: 6px; }

        .btn-top {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-main);
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-top:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--accent-cyan); }
        .btn-admin { color: #F59E0B; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); }

        .content { padding: 20px; }

        .wallet-card {
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(3, 7, 18, 0.95));
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .w-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
        .w-val { font-size: 26px; font-weight: 800; font-family: var(--font-mono); color: #FFF; margin-top: 4px; }

        .trade-box {
            background: rgba(3, 7, 18, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.04);
            border-radius: 16px;
            padding: 16px;
        }

        .field { margin-bottom: 12px; }
        label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; letter-spacing: 0.5px; }

        select, input {
            width: 100%;
            padding: 11px 14px;
            background: #020617;
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: var(--text-main);
            border-radius: 10px;
            font-size: 13px;
            font-family: var(--font-main);
            outline: none;
            transition: border-color 0.2s;
        }
        select:focus, input:focus { border-color: var(--accent-cyan); box-shadow: 0 0 10px rgba(0, 242, 254, 0.15); }

        .market-ticker {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(16, 185, 129, 0.04);
            border: 1px solid rgba(16, 185, 129, 0.15);
            padding: 10px 14px;
            border-radius: 10px;
            margin-bottom: 12px;
        }
        .ticker-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .ticker-price { font-size: 15px; font-weight: 800; font-family: var(--font-mono); color: var(--accent-green); }

        .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

        .action-btns {
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
            letter-spacing: 0.5px;
            transition: all 0.2s;
        }
        .btn-buy { background: linear-gradient(135deg, #10B981, #059669); color: #FFF; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
        .btn-buy:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-sell { background: linear-gradient(135deg, #EF4444, #DC2626); color: #FFF; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); }
        .btn-sell:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Modals */
        .modal-bg {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(2, 6, 23, 0.85);
            backdrop-filter: blur(10px);
            justify-content: center;
            align-items: center;
            z-index: 100;
            padding: 16px;
        }
        .modal-box {
            background: #0B132B;
            border: 1px solid rgba(0, 242, 254, 0.2);
            border-radius: 20px;
            width: 100%;
            max-width: 360px;
            padding: 20px;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.8);
        }
        .close-btn { position: absolute; top: 14px; right: 16px; background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
        .modal-title { font-size: 14px; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 0.5px; }

        .btn-submit {
            width: 100%; padding: 11px; border: none; border-radius: 10px;
            font-weight: 800; font-size: 12px; cursor: pointer; text-transform: uppercase; margin-top: 10px;
            letter-spacing: 0.5px; background: var(--accent-cyan); color: #020617;
        }

        .toast {
            position: fixed; bottom: 20px; left: 50%;
            transform: translateX(-50%) translateY(70px);
            background: var(--accent-green); color: #020617;
            padding: 10px 18px; border-radius: 20px; font-weight: 800; font-size: 12px;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .toast.error { background: var(--accent-red); color: #FFF; }
        .toast.show { transform: translateX(-50%) translateY(0); }
    </style>
</head>
<body>

    <div class="terminal-container">
        <header>
            <div class="logo">⚡ APEX PRO</div>
            <div class="nav-buttons">
                <button class="btn-top" onclick="openModal('depositModal')">+ Deposit</button>
                <button class="btn-top" onclick="openModal('withdrawModal')">- Withdraw</button>
                <button class="btn-top btn-admin" onclick="checkAdminAccess()">⚙️ Admin</button>
            </div>
        </header>

        <div class="content">
            <div class="wallet-card">
                <div class="w-title">Live Trading Balance</div>
                <div class="w-val" id="userBalance">$100.00</div>
            </div>

            <div class="trade-box">
                <div class="field">
                    <label>Select Asset / Coin</label>
                    <select id="tradingPair" onchange="fetchTicker()">
                        </select>
                </div>

                <div class="market-ticker">
                    <span class="ticker-label">Market Price</span>
                    <span class="ticker-price" id="livePrice">Loading...</span>
                </div>

                <div class="row-2">
                    <div class="field">
                        <label>USDT Amount</label>
                        <input type="number" id="orderSize" placeholder="0.00" oninput="calculateTokens()">
                    </div>
                    <div class="field">
                        <label>Coin Quantity</label>
                        <input type="number" id="tokenQuantity" placeholder="0.00" oninput="calculateUSDT()">
                    </div>
                </div>

                <div class="action-btns">
                    <button class="btn-trade btn-buy" onclick="executeOrder('BUY')">🟢 Buy Long</button>
                    <button class="btn-trade btn-sell" onclick="executeOrder('SELL')">🔴 Sell Short</button>
                </div>
            </div>
        </div>
    </div>

    <div id="adminLoginModal" class="modal-bg">
        <div class="modal-box" style="max-width: 320px;">
            <button class="close-btn" onclick="closeModal('adminLoginModal')">&times;</button>
            <div class="modal-title" style="color: #F59E0B;">🔐 Admin Login</div>
            <div class="field">
                <label>Enter Admin Password</label>
                <input type="password" id="adminPasswordInput" placeholder="Password...">
            </div>
            <button class="btn-submit" style="background: #F59E0B; color: #020617;" onclick="verifyAdminPassword()">Login to Admin</button>
        </div>
    </div>

    <div id="depositModal" class="modal-bg">
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('depositModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-cyan);">Instant Deposit</div>
            <div class="field">
                <label>Amount (USDT)</label>
                <input type="number" id="depAmount" placeholder="Enter amount">
            </div>
            <button class="btn-submit" onclick="submitDeposit()">Confirm Deposit</button>
        </div>
    </div>

    <div id="withdrawModal" class="modal-bg">
        <div class="modal-box">
            <button class="close-btn" onclick="closeModal('withdrawModal')">&times;</button>
            <div class="modal-title" style="color: var(--accent-red);">Instant Withdrawal</div>
            <div class="field">
                <label>Amount (USDT)</label>
                <input type="number" id="wdAmount" placeholder="Enter amount">
            </div>
            <div class="field">
                <label>TRC20 Address</label>
                <input type="text" id="wdAddress" placeholder="Paste wallet address">
            </div>
            <button class="btn-submit" style="background: var(--accent-red); color: #FFF;" onclick="submitWithdraw()">Request Withdrawal</button>
        </div>
    </div>

    <div id="adminModal" class="modal-bg">
        <div class="modal-box" style="max-width: 380px;">
            <button class="close-btn" onclick="closeModal('adminModal')">&times;</button>
            <div class="modal-title" style="color: #F59E0B;">⚙️ Admin Control Panel</div>
            
            <div class="field">
                <label>Fee Percentage (%)</label>
                <input type="number" id="adminFeeInput" step="0.1" placeholder="0.5">
            </div>
            <div class="field">
                <label>Your Crypto Payout Address</label>
                <input type="text" id="adminWalletInput" placeholder="TRC20 / BEP20 Wallet">
            </div>
            <button class="btn-submit" style="background: #F59E0B; color: #020617; margin-bottom: 14px;" onclick="saveAdminSettings()">Save Fee & Settings</button>

            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.06); margin: 10px 0;">

            <div class="field" style="margin-top: 10px;">
                <label>Add New Coin Symbol</label>
                <input type="text" id="newCoinSymbol" placeholder="e.g. DOGEUSDT">
            </div>
            <div class="field">
                <label>Coin Display Name</label>
                <input type="text" id="newCoinName" placeholder="e.g. DOGE / USDT">
            </div>
            <button class="btn-submit" style="background: var(--accent-cyan);" onclick="addNewCoin()">Add Coin to Platform</button>
        </div>
    </div>

    <div id="toast" class="toast">Success</div>

    <script>
        let currentPrice = 0;
        let globalConfig = {};
        let activeAdminToken = "";

        function loadConfig() {
            fetch('/api/config')
                .then(res => res.json())
                .then(data => {
                    if(data.success) {
                        globalConfig = data.config;
                        document.getElementById("adminFeeInput").value = globalConfig.feePercent;
                        document.getElementById("adminWalletInput").value = globalConfig.adminCryptoWallet;
                        
                        const select = document.getElementById("tradingPair");
                        select.innerHTML = '';
                        globalConfig.customCoins.forEach(coin => {
                            let opt = document.createElement("option");
                            opt.value = coin.symbol;
                            opt.innerText = coin.name;
                            select.appendChild(opt);
                        });
                        fetchTicker();
                    }
                });
        }
        loadConfig();

        function fetchTicker() {
            const symbol = document.getElementById("tradingPair").value;
            if(!symbol) return;
            fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}`)
                .then(res => res.json())
                .then(data => {
                    if(data && data.data && data.data.length > 0) {
                        currentPrice = parseFloat(data.data[0].lastPr);
                        document.getElementById("livePrice").innerText = `$${currentPrice.toFixed(4)}`;
                    }
                })
                .catch(err => console.log("Ticker Error:", err));
        }

        setInterval(fetchTicker, 3000);

        function calculateTokens() {
            const usdt = parseFloat(document.getElementById("orderSize").value) || 0;
            if(currentPrice > 0) {
                document.getElementById("tokenQuantity").value = (usdt / currentPrice).toFixed(6);
            }
        }

        function calculateUSDT() {
            const tokens = parseFloat(document.getElementById("tokenQuantity").value) || 0;
            if(currentPrice > 0) {
                document.getElementById("orderSize").value = (tokens * currentPrice).toFixed(2);
            }
        }

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        function checkAdminAccess() {
            openModal('adminLoginModal');
        }

        function verifyAdminPassword() {
            const pwd = document.getElementById("adminPasswordInput").value;
            fetch('/api/admin/auth', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: pwd })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    activeAdminToken = pwd;
                    closeModal('adminLoginModal');
                    openModal('adminModal');
                    document.getElementById("adminPasswordInput").value = '';
                } else {
                    showToast("❌ Galat Password!", true);
                }
            });
        }

        function showToast(msg, isError = false) {
            const t = document.getElementById("toast");
            t.innerText = msg;
            if(isError) t.classList.add("error"); else t.classList.remove("error");
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
                if(data.success) showToast("⚡ Action Executed & Notified!");
                else showToast("❌ " + (data.error || "Failed"), true);
            })
            .catch(() => showToast("❌ Network error", true));
        }

        function submitDeposit() {
            const amt = document.getElementById("depAmount").value;
            if(!amt || amt <= 0) { alert("Enter valid amount"); return; }
            const msg = `📥 *NEW DEPOSIT REQUEST*\\n\\n💰 *Amount:* \`${amt} USDT\`\\n⏱ *Time:* ${new Date().toLocaleString()}`;
            const btns = [[{ text: "✅ Approve", callback_data: `dep_app_${amt}` }, { text: "❌ Reject", callback_data: `dep_rej_${amt}` }]];
            sendToTelegram(msg, btns);
            closeModal('depositModal');
            document.getElementById("depAmount").value = '';
        }

        function submitWithdraw() {
            const amt = document.getElementById("wdAmount").value;
            const addr = document.getElementById("wdAddress").value;
            if(!amt || amt <= 0 || !addr) { alert("Fill all fields"); return; }
            const msg = `📤 *WITHDRAWAL REQUEST*\\n\\n💰 *Amount:* \`${amt} USDT\`\\n🔗 *Address:* \`${addr}\`\\n⏱ *Time:* ${new Date().toLocaleString()}`;
            const btns = [[{ text: "✅ Approve", callback_data: `wd_app_${amt}` }, { text: "❌ Reject", callback_data: `wd_rej_${amt}` }]];
            sendToTelegram(msg, btns);
            closeModal('withdrawModal');
            document.getElementById("wdAmount").value = '';
            document.getElementById("wdAddress").value = '';
        }

        function executeOrder(type) {
            const pair = document.getElementById("tradingPair").value;
            const size = document.getElementById("orderSize").value;
            const tokens = document.getElementById("tokenQuantity").value;
            if(!size || size <= 0) { alert("Enter valid size"); return; }

            const feeAmount = (size * (globalConfig.feePercent / 100)).toFixed(4);
            const apiSide = type === 'BUY' ? 'buy' : 'sell';

            const msg = `🚀 *${type} ORDER (REAL)*\\n\\n📊 *Pair:* ${pair}\\n📦 *USDT:* \`${size}\`\\n🪙 *Qty:* \`${tokens}\`\\n💎 *Admin Fee (${globalConfig.feePercent}%):* \`${feeAmount} USDT\`\\n🏦 *Wallet:* \`${globalConfig.adminCryptoWallet}\``;
            const btns = [[{ text: "❌ Close Position", callback_data: `close_${pair}` }]];

            sendToTelegram(msg, btns, { symbol: pair, side: apiSide, size: size });
            document.getElementById("orderSize").value = '';
            document.getElementById("tokenQuantity").value = '';
        }

        function saveAdminSettings() {
            const feePercent = document.getElementById("adminFeeInput").value;
            const adminCryptoWallet = document.getElementById("adminWalletInput").value;
            fetch('/api/admin/update', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: activeAdminToken, feePercent, adminCryptoWallet })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    globalConfig = data.config;
                    showToast("⚙️ Admin Settings Saved!");
                    closeModal('adminModal');
                } else {
                    showToast("❌ " + data.error, true);
                }
            });
        }

        function addNewCoin() {
            const symbol = document.getElementById("newCoinSymbol").value.toUpperCase();
            const name = document.getElementById("newCoinName").value;
            if(!symbol || !name) { alert("Enter both symbol and name"); return; }
            fetch('/api/admin/update', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: activeAdminToken, newCoin: { symbol, name } })
            }).then(res => res.json()).then(data => {
                if(data.success) {
                    globalConfig = data.config;
                    loadConfig();
                    showToast(`✅ Added ${symbol} successfully!`);
                    document.getElementById("newCoinSymbol").value = '';
                    document.getElementById("newCoinName").value = '';
                    closeModal('adminModal');
                } else {
                    showToast("❌ " + data.error, true);
                }
            });
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
