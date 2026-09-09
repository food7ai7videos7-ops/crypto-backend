/**
 * Crypto Hub & Admin Panel Logic - JSONBin Cloud Sync Version (Vercel 500 Error Fixed)
 */

// Aap yahan apni free JSONBin.io ki details dal sakte hain taake cloud sync chale
const JSONBIN_BIN_ID = "66f212fbe41b4d34e42d76b1"; // Example Public Bin ID
const JSONBIN_API_KEY = "$2a$10$YourMasterKeyHere"; // Optional for public read/write or use free endpoint

const allMarketPairs = [
    { symbol: 'BTCUSDT', price: 78648.01, change: -0.34 },
    { symbol: 'ETHUSDT', price: 2488.91, change: +0.10 },
    { symbol: 'SOLUSDT', price: 184.50, change: +2.45 },
    { symbol: 'XRPUSDT', price: 2.14, change: +1.20 },
    { symbol: 'BNBUSDT', price: 749.56, change: +0.88 },
    { symbol: 'DOGEUSDT', price: 0.22, change: -1.15 },
    { symbol: 'PEPEUSDT', price: 0.000014, change: +5.40 },
    { symbol: 'ADAUSDT', price: 0.85, change: -0.45 },
    { symbol: 'TRXUSDT', price: 0.24, change: +0.15 }
];

function getOrCreateUserId() {
    let userId = localStorage.getItem("crypto_hub_unique_uid");
    if (!userId) {
        userId = "UID-" + Math.floor(10000000 + Math.random() * 90000000);
        localStorage.setItem("crypto_hub_unique_uid", userId);
    }
    return userId;
}

// Local fallback data structure
function getDefaultData() {
    return {
        config: { trc20: '', details: '', fee: '0.1' },
        deposits: [],
        withdrawals: [],
        balances: {}
    };
}

function getLocalData() {
    let data = localStorage.getItem("crypto_hub_local_db");
    if (!data) {
        const initialData = getDefaultData();
        localStorage.setItem("crypto_hub_local_db", JSON.stringify(initialData));
        return initialData;
    }
    return JSON.parse(data);
}

function saveLocalData(data) {
    localStorage.setItem("crypto_hub_local_db", JSON.stringify(data));
    // Background mein cloud sync ki koshish
    syncDataToCloud(data);
}

// Cloud Sync Functions (Vercel serverless crash se bachne ke liye direct client-side fetch)
async function fetchCloudData() {
    try {
        // Localstorage se foran UI update karo taake speed fast rahay
        const localData = getLocalData();
        updateUIWithState(localData);
        
        // Agar cloud bin ID di hai toh wahan se latest data fetch karo
        if (JSONBIN_BIN_ID && JSONBIN_BIN_ID !== "YOUR_BIN_ID_HERE") {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
                headers: { 'X-Master-Key': JSONBIN_API_KEY }
            });
            if (response.ok) {
                const resJson = await response.json();
                if (resJson && resJson.record) {
                    saveLocalData(resJson.record);
                    updateUIWithState(resJson.record);
                }
            }
        }
    } catch (e) {
        console.log("Using local state due to network/cloud timeout.");
    }
}

async function syncDataToCloud(data) {
    try {
        if (JSONBIN_BIN_ID && JSONBIN_BIN_ID !== "YOUR_BIN_ID_HERE") {
            await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_API_KEY
                },
                body: JSON.stringify(data)
            });
        }
    } catch (e) {
        console.log("Cloud sync update skipped.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const myId = getOrCreateUserId();
    const uidDisplay = document.getElementById("userUniqueIdDisplay");
    if (uidDisplay) uidDisplay.innerText = myId;

    renderMarketsList(allMarketPairs);
    setupMarketSearch();
    fetchCloudData();

    setInterval(fetchCloudData, 3000);
});

function updateUIWithState(data) {
    const myId = getOrCreateUserId();

    const userBal = data.balances && data.balances[myId] ? data.balances[myId] : 0;
    const balEl = document.getElementById("userBalance");
    if (balEl) balEl.innerText = `$${parseFloat(userBal).toFixed(2)}`;

    const holdingsEl = document.getElementById("userHoldings");
    if (holdingsEl) {
        if (userBal > 0) {
            holdingsEl.innerHTML = `
                <div class="flex justify-between items-center text-xs py-1 border-b border-gray-800">
                    <span class="text-white font-bold">USDT / USD</span>
                    <span class="text-yellow-400">$${parseFloat(userBal).toFixed(2)}</span>
                </div>`;
        } else {
            holdingsEl.innerHTML = `No holdings available`;
        }
    }

    const instructionsEl = document.getElementById("depositInstructions");
    if (instructionsEl) {
        instructionsEl.innerHTML = `
            <strong class="text-yellow-400 block mb-1">USDT (TRC20) Address:</strong>
            <span class="text-white break-all select-all">${data.config.trc20 || 'Not set'}</span>
            <strong class="text-yellow-400 block mt-2 mb-1">EasyPaisa / JazzCash:</strong>
            <span class="text-white">${data.config.details || 'Not set'}</span>
        `;
    }

    const adminPanelEl = document.getElementById("adminPanel");
    const isAdminOpen = adminPanelEl && adminPanelEl.style.display === 'block';
    if (!isAdminOpen) return;

    const addrInput = document.getElementById("depositAddressInput");
    const detailsInput = document.getElementById("depositDetailsInput");
    const feeInput = document.getElementById("feeInput");

    if (addrInput && document.activeElement !== addrInput && !addrInput.value) addrInput.value = data.config.trc20 || '';
    if (detailsInput && document.activeElement !== detailsInput && !detailsInput.value) detailsInput.value = data.config.details || '';
    if (feeInput && document.activeElement !== feeInput) feeInput.value = data.config.fee || '0.1';

    const depContainer = document.getElementById("pendingDeposits");
    const withContainer = document.getElementById("pendingWithdrawals");

    if (depContainer) {
        depContainer.innerHTML = data.deposits && data.deposits.length > 0 
            ? data.deposits.map((d, index) => `
                <div class="flex justify-between items-center py-2 border-b border-gray-800 text-[11px]">
                    <div>
                        <span class="text-white font-bold">${d.amount} USDT</span>
                        <span class="text-yellow-400 block text-[10px] font-mono">UID: ${d.userId}</span>
                        <span class="text-gray-500 block text-[9px]">${d.time}</span>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="approveDeposit(${index})" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Approve</button>
                        <button onclick="rejectDeposit(${index})" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Reject</button>
                    </div>
                </div>`).join('')
            : `<span class="text-gray-500 text-[11px]">No pending deposits</span>`;
    }

    if (withContainer) {
        withContainer.innerHTML = data.withdrawals && data.withdrawals.length > 0 
            ? data.withdrawals.map((w, index) => `
                <div class="flex justify-between items-center py-2 border-b border-gray-800 text-[11px]">
                    <div>
                        <span class="text-white font-bold">${w.amount} USDT</span>
                        <span class="text-yellow-400 block text-[10px] font-mono">UID: ${w.userId}</span>
                        <span class="text-gray-500 block text-[9px]">${w.time}</span>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="approveWithdrawal(${index})" class="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Approve</button>
                        <button onclick="rejectWithdrawal(${index})" class="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Reject</button>
                    </div>
                </div>`).join('')
            : `<span class="text-gray-500 text-[11px]">No pending withdrawals</span>`;
    }
}

function saveDepositInfo() {
    const trc20 = document.getElementById("depositAddressInput").value.trim();
    const details = document.getElementById("depositDetailsInput").value.trim();

    let data = getLocalData();
    data.config.trc20 = trc20;
    data.config.details = details;
    saveLocalData(data);

    alert("Deposit Info saved successfully!");
    fetchCloudData();
}

function saveFee() {
    const feeVal = document.getElementById("feeInput").value;
    let data = getLocalData();
    data.config.fee = feeVal;
    saveLocalData(data);

    alert("Trading fee saved successfully!");
    fetchCloudData();
}

function submitDepositRequest() {
    const amount = parseFloat(document.getElementById("depositAmountInput").value);
    if (!amount || amount <= 0) { alert("Enter a valid deposit amount."); return; }

    const myId = getOrCreateUserId();
    const timeStr = new Date().toLocaleTimeString();

    let data = getLocalData();
    if (!data.deposits) data.deposits = [];
    data.deposits.push({ amount: amount, userId: myId, time: timeStr });
    saveLocalData(data);

    alert("Deposit request sent to admin successfully!");
    closeDepositModal();
    document.getElementById("depositAmountInput").value = '';
    fetchCloudData();
}

function submitWithdrawRequest() {
    const amount = parseFloat(document.getElementById("withdrawAddressInput").value);
    if (!amount || amount <= 0) { alert("Enter withdrawal amount."); return; }

    const myId = getOrCreateUserId();
    const timeStr = new Date().toLocaleTimeString();

    let data = getLocalData();
    if (!data.withdrawals) data.withdrawals = [];
    data.withdrawals.push({ amount: amount, userId: myId, time: timeStr });
    saveLocalData(data);

    alert("Withdrawal request sent to admin successfully!");
    closeWithdrawModal();
    document.getElementById("withdrawAddressInput").value = '';
    fetchCloudData();
}

function approveDeposit(index) {
    let data = getLocalData();
    const dep = data.deposits[index];
    if (dep) {
        const uid = dep.userId;
        const amt = parseFloat(dep.amount);

        if (!data.balances) data.balances = {};
        data.balances[uid] = (data.balances[uid] || 0) + amt;
        data.deposits.splice(index, 1);

        saveLocalData(data);
        fetchCloudData();
        alert(`Deposit approved! $${amt} added to User ID: ${uid}`);
    }
}

function rejectDeposit(index) {
    let data = getLocalData();
    data.deposits.splice(index, 1);
    saveLocalData(data);
    fetchCloudData();
    alert("Deposit rejected successfully.");
}

function approveWithdrawal(index) {
    let data = getLocalData();
    const w = data.withdrawals[index];
    if (w) {
        const uid = w.userId;
        const amt = parseFloat(w.amount);

        if (data.balances[uid] && data.balances[uid] >= amt) {
            data.balances[uid] -= amt;
        }

        data.withdrawals.splice(index, 1);
        saveLocalData(data);
        fetchCloudData();
        alert("Withdrawal approved!");
    }
}

function rejectWithdrawal(index) {
    let data = getLocalData();
    data.withdrawals.splice(index, 1);
    saveLocalData(data);
    fetchCloudData();
    alert("Withdrawal rejected.");
}

function renderMarketsList(pairs) {
    const container = document.getElementById("marketsListContainer");
    if (!container) return;
    container.innerHTML = pairs.map(coin => `
        <div onclick="selectTradingPair('${coin.symbol}', ${coin.price})" class="flex justify-between items-center p-2 bg-gray-950 rounded-lg border border-gray-800 cursor-pointer hover:border-yellow-500 transition">
            <div><span class="font-bold text-xs text-white">${coin.symbol}</span></div>
            <div class="text-right">
                <span class="text-xs text-white">${coin.price.toFixed(4)}</span>
                <span class="text-[10px] ${coin.change >= 0 ? 'text-green-400' : 'text-red-400'} block">${coin.change >= 0 ? '+' : ''}${coin.change}%</span>
            </div>
        </div>
    `).join('');
}

function setupMarketSearch() {
    const searchInput = document.getElementById("marketSearch");
    if (!searchInput) return;
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allMarketPairs.filter(coin => coin.symbol.toLowerCase().includes(query));
        renderMarketsList(filtered);
    });
}

let currentSymbol = 'BTCUSDT';
let currentPrice = 78648.01;
function selectTradingPair(symbol, price) {
    currentSymbol = symbol;
    currentPrice = price;
    document.getElementById("activeTradingSymbol").innerText = symbol;
    document.getElementById("activeTradingPrice").innerText = `$${price.toFixed(4)}`;
}

function executeTrade(side) {
    const amountInput = document.getElementById("tradeAmountInput").value;
    const tradeAmount = parseFloat(amountInput);

    if (!tradeAmount || tradeAmount <= 0) {
        alert("Please enter a valid trade amount.");
        return;
    }

    const myId = getOrCreateUserId();
    let data = getLocalData();
    const currentBalance = data.balances && data.balances[myId] ? data.balances[myId] : 0;

    if (currentBalance < tradeAmount) {
        alert(`Insufficient Balance ($${currentBalance.toFixed(2)}). Please deposit funds first to trade!`);
        return;
    }

    alert(`Trade (${side.toUpperCase()}) executed successfully for $${tradeAmount} (UID: ${myId})`);
    document.getElementById("tradeAmountInput").value = '';
}

function openDepositModal() { document.getElementById("depositModal").style.display = 'flex'; }
function closeDepositModal() { document.getElementById("depositModal").style.display = 'none'; }
function openWithdrawModal() { document.getElementById("withdrawModal").style.display = 'flex'; }
function closeWithdrawModal() { document.getElementById("withdrawModal").style.display = 'none'; }
function openAdminSecurityModal() { document.getElementById("adminSecurityModal").style.display = 'flex'; }
function closeAdminSecurityModal() { document.getElementById("adminSecurityModal").style.display = 'none'; }

function verifyAdminPanelPassword() {
    try {
        const pwdInput = document.getElementById("adminPasswordInput");
        if (!pwdInput) {
            alert("Error: adminPasswordInput element nahi mila!");
            return;
        }
        const pwd = pwdInput.value;
        
        if (pwd === "Mmooossaa35") {
            closeAdminSecurityModal();
            const panel = document.getElementById("adminPanel");
            if (!panel) {
                alert("Error: adminPanel div HTML mein nahi mila!");
                return;
            }
            panel.style.display = 'block';
            pwdInput.value = '';
            panel.scrollIntoView({ behavior: 'smooth' });
            fetchCloudData();
        } else {
            alert("Incorrect Password!");
        }
    } catch (err) {
        alert("JS Error: " + err.message);
    }
}
function closeAdminPanel() { document.getElementById("adminPanel").style.display = 'none'; }
