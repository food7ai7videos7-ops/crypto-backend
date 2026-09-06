const express = require('express');
const path = require('path');
const ccxt = require('ccxt'); // Bitget real execution ke liye
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Configuration & Bitget API Credentials (Aap yahan apni purani API keys daal sakte hain)
let adminConfig = {
    depositAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d89B5", // Default / Admin updated address
    adminPassword: "adminPassword123",
    minDeposit: 0.01,
    tradingFeePercent: 5,
    // Aapki apni Bitget API Keys yahan configure hongi
    bitgetApiKey: "YOUR_EXISTING_BITGET_API_KEY",
    bitgetSecret: "YOUR_EXISTING_BITGET_SECRET",
    bitgetPassphrase: "YOUR_EXISTING_BITGET_PASSPHRASE"
};

let userAccount = {
    balance: 0.00,
    holdings: 0.000000,
    avgEntry: 0.00,
    accumulatedFee: 0.00,
    tradeHistory: []
};

let pendingDeposits = [];
let pendingWithdrawals = [];
let customCoins = [
    { symbol: 'BTCUSDT', price: 79700.50 },
    { symbol: 'ETHUSDT', price: 3450.20 },
    { symbol: 'SOLUSDT', price: 185.40 },
    { symbol: 'XRPUSDT', price: 2.45 }
];

// Public Config (Deposit address frontend ko bhejne ke liye)
app.get('/api/admin/config', (req, res) => {
    res.json({ 
        success: true, 
        depositAddress: adminConfig.depositAddress, 
        coins: customCoins 
    });
});

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === adminConfig.adminPassword) {
        res.json({ 
            success: true, 
            adminConfig, 
            pendingDeposits, 
            pendingWithdrawals,
            coins: customCoins
        });
    } else {
        res.status(401).json({ success: false, message: 'Galat admin password!' });
    }
});

// Update Admin Settings & API Keys
app.post('/api/admin/update-settings', (req, res) => {
    const { depositAddress, minDeposit, tradingFeePercent, bitgetApiKey, bitgetSecret, bitgetPassphrase } = req.body;
    if (depositAddress) adminConfig.depositAddress = depositAddress;
    if (minDeposit !== undefined) adminConfig.minDeposit = parseFloat(minDeposit);
    if (tradingFeePercent !== undefined) adminConfig.tradingFeePercent = parseFloat(tradingFeePercent);
    if (bitgetApiKey) adminConfig.bitgetApiKey = bitgetApiKey;
    if (bitgetSecret) adminConfig.bitgetSecret = bitgetSecret;
    if (bitgetPassphrase) adminConfig.bitgetPassphrase = bitgetPassphrase;
    
    res.json({ success: true, message: 'Settings aur API keys successfully update ho gayi!' });
});

// Add Coin
app.post('/api/admin/add-coin', (req, res) => {
    const { symbol, price } = req.body;
    if (!symbol || !price) return res.status(400).json({ success: false, message: 'Invalid coin data' });
    customCoins.push({ symbol: symbol.toUpperCase(), price: parseFloat(price) });
    res.json({ success: true, message: 'New coin add ho gaya!', coins: customCoins });
});

// Approve Deposit
app.post('/api/admin/approve-deposit', (req, res) => {
    const { id } = req.body;
    const index = pendingDeposits.findIndex(d => d.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Deposit request nahi mili' });

    const deposit = pendingDeposits.splice(index, 1)[0];
    userAccount.balance += deposit.amount;
    userAccount.tradeHistory.unshift({
        details: `Approved Deposit: +$${deposit.amount} USDT`,
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: `Deposit $${deposit.amount} approve ho gaya!` });
});

// Approve/Reject Withdrawal
app.post('/api/admin/approve-withdraw', (req, res) => {
    const { id, action } = req.body;
    const index = pendingWithdrawals.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Withdrawal request nahi mili' });

    const withdrawal = pendingWithdrawals.splice(index, 1)[0];
    if (action === 'approve') {
        userAccount.tradeHistory.unshift({
            details: `Processed Withdrawal: -$${withdrawal.amount} USDT`,
            time: new Date().toLocaleTimeString()
        });
        res.json({ success: true, message: `Withdrawal $${withdrawal.amount} approve ho gaya!` });
    } else {
        userAccount.balance += withdrawal.amount;
        res.json({ success: true, message: `Withdrawal reject ho gaya aur amount refund ho gayi.` });
    }
});

// User Account Info
app.get('/api/user/account', (req, res) => {
    res.json({ 
        success: true, 
        account: userAccount, 
        depositAddress: adminConfig.depositAddress 
    });
});

// User Deposit Request
app.post('/api/deposit', (req, res) => {
    const { amount, txid } = req.body;
    if (!amount || amount < adminConfig.minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount $${adminConfig.minDeposit} hai` });
    }

    pendingDeposits.push({
        id: Date.now().toString(),
        amount: parseFloat(amount),
        txid: txid || 'Bitget Transfer',
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: 'Deposit request submit ho gayi! Admin approval ka wait karein.' });
});

// User Withdraw Request
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    if (!amount || amount <= 0 || !address) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal details' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Balance kam hai!' });
    }

    userAccount.balance -= parseFloat(amount);
    pendingWithdrawals.push({
        id: Date.now().toString(),
        amount: parseFloat(amount),
        address,
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: 'Withdrawal request admin approval ke liye bhej di gayi hai.' });
});

// REAL BITGET TRADE EXECUTION
app.post('/api/trade', async (req, res) => {
    const { symbol, side, amount, price } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid trade amount enter karein.' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Trade ke liye balance kam hai.' });
    }

    // Fee calculation
    const fee = (amount * adminConfig.tradingFeePercent) / 100;
    const netInvestment = amount - fee;

    try {
        // Agar aapne apni Bitget API keys di hain, toh real exchange par order fire hoga
        if (adminConfig.bitgetApiKey && adminConfig.bitgetApiKey !== "YOUR_EXISTING_BITGET_API_KEY") {
            const bitget = new ccxt.bitget({
                apiKey: adminConfig.bitgetApiKey,
                secret: adminConfig.bitgetSecret,
                password: adminConfig.bitgetPassphrase,
            });
            // Bitget par real market order place karna
            // (Note: Real trading ke liye exchange account mein funds hone chahiye)
            await bitget.createOrder(symbol, 'market', side.toLowerCase(), netInvestment / price);
        }

        userAccount.balance -= amount;
        userAccount.accumulatedFee += fee;
        userAccount.holdings += (netInvestment / price);
        userAccount.avgEntry = price;

        userAccount.tradeHistory.unshift({
            details: `${side} ${symbol} worth $${netInvestment.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
            time: new Date().toLocaleTimeString()
        });

        res.json({ 
            success: true, 
            message: `Order Bitget par successfully execute ho gaya! Fee: $${fee.toFixed(2)}`,
            account: userAccount 
        });
    } catch (error) {
        console.error("Bitget API Error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: `Bitget Error: ${error.message}. (Apni API keys check karein)` 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
