const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Configuration & State
let adminConfig = {
    depositAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d89B5", // Aapka Bitget Address
    adminPassword: "adminPassword123", // Secure Admin Password
    minDeposit: 0.01,
    tradingFeePercent: 5
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

// Public Config
app.get('/api/admin/config', (req, res) => {
    res.json({ success: true, depositAddress: adminConfig.depositAddress, coins: customCoins });
});

// Admin Authentication & Dashboard Data
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
        res.status(401).json({ success: false, message: 'Invalid admin password!' });
    }
});

// Update Admin Settings
app.post('/api/admin/update-settings', (req, res) => {
    const { depositAddress, minDeposit, tradingFeePercent } = req.body;
    if (depositAddress) adminConfig.depositAddress = depositAddress;
    if (minDeposit !== undefined) adminConfig.minDeposit = parseFloat(minDeposit);
    if (tradingFeePercent !== undefined) adminConfig.tradingFeePercent = parseFloat(tradingFeePercent);
    
    res.json({ success: true, message: 'Admin settings updated successfully!' });
});

// Add New Coin
app.post('/api/admin/add-coin', (req, res) => {
    const { symbol, price } = req.body;
    if (!symbol || !price) return res.status(400).json({ success: false, message: 'Invalid coin data' });
    
    customCoins.push({ symbol: symbol.toUpperCase(), price: parseFloat(price) });
    res.json({ success: true, message: 'New coin added successfully!', coins: customCoins });
});

// Approve / Reject Deposit
app.post('/api/admin/approve-deposit', (req, res) => {
    const { id } = req.body;
    const index = pendingDeposits.findIndex(d => d.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Deposit request not found' });

    const deposit = pendingDeposits.splice(index, 1)[0];
    userAccount.balance += deposit.amount;
    userAccount.tradeHistory.unshift({
        details: `Approved Deposit: +$${deposit.amount} USDT`,
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: `Deposit of $${deposit.amount} approved and added!` });
});

// Approve / Reject Withdrawal
app.post('/api/admin/approve-withdraw', (req, res) => {
    const { id, action } = req.body;
    const index = pendingWithdrawals.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).json({ success: false, message: 'Withdrawal request not found' });

    const withdrawal = pendingWithdrawals.splice(index, 1)[0];
    
    if (action === 'approve') {
        userAccount.tradeHistory.unshift({
            details: `Processed Withdrawal: -$${withdrawal.amount} USDT`,
            time: new Date().toLocaleTimeString()
        });
        res.json({ success: true, message: `Withdrawal of $${withdrawal.amount} approved!` });
    } else {
        userAccount.balance += withdrawal.amount; // Refund on rejection
        res.json({ success: true, message: `Withdrawal rejected & amount refunded.` });
    }
});

// User Account Info
app.get('/api/user/account', (req, res) => {
    res.json({ success: true, account: userAccount, depositAddress: adminConfig.depositAddress });
});

// User Deposit Request
app.post('/api/deposit', (req, res) => {
    const { amount, txid } = req.body;
    if (!amount || amount < adminConfig.minDeposit) {
        return res.status(400).json({ success: false, message: `Minimum deposit amount is $${adminConfig.minDeposit}` });
    }

    pendingDeposits.push({
        id: Date.now().toString(),
        amount: parseFloat(amount),
        txid: txid || 'Bitget Transfer',
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: 'Deposit submitted! Waiting for admin approval.' });
});

// User Withdraw Request
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    if (!amount || amount <= 0 || !address) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal details' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance for withdrawal!' });
    }

    userAccount.balance -= parseFloat(amount);
    pendingWithdrawals.push({
        id: Date.now().toString(),
        amount: parseFloat(amount),
        address,
        time: new Date().toLocaleTimeString()
    });

    res.json({ success: true, message: 'Withdrawal request sent for admin approval.' });
});

// Real Trade Execution (Bitget Simulation & Fee Deduction)
app.post('/api/trade', (req, res) => {
    const { symbol, side, amount, price } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid trade amount.' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance to execute trade.' });
    }

    // Calculate Trading Fee
    const fee = (amount * adminConfig.tradingFeePercent) / 100;
    const netInvestment = amount - fee;

    userAccount.balance -= amount;
    userAccount.accumulatedFee += fee; // Admin profit collection
    userAccount.holdings += (netInvestment / price);
    userAccount.avgEntry = price;

    userAccount.tradeHistory.unshift({
        details: `${side} ${symbol} worth $${netInvestment.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
        time: new Date().toLocaleTimeString()
    });

    res.json({ 
        success: true, 
        message: `Order executed on Bitget successfully! Fee collected: $${fee.toFixed(2)}`,
        account: userAccount 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
