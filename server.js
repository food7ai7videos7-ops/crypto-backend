const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Configuration & Bitget API Credentials
let adminConfig = {
    depositAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d89B5",
    adminPassword: "adminPassword123",
    minDeposit: 0.01,
    tradingFeePercent: 5,
    bitgetApiKey: "",
    bitgetSecret: "",
    bitgetPassphrase: ""
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

// Helper function to sign Bitget API requests securely (HMAC-SHA256)
function signBitget(method, requestPath, body, secretKey) {
    const timestamp = Date.now().toString();
    const bodyString = body ? JSON.stringify(body) : '';
    const message = timestamp + method.toUpperCase() + requestPath + bodyString;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
    return { timestamp, signature };
}

app.get('/api/admin/config', (req, res) => {
    res.json({ 
        success: true, 
        depositAddress: adminConfig.depositAddress, 
        coins: customCoins 
    });
});

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

app.post('/api/admin/update-settings', (req, res) => {
    const { depositAddress, minDeposit, tradingFeePercent, bitgetApiKey, bitgetSecret, bitgetPassphrase } = req.body;
    if (depositAddress) adminConfig.depositAddress = depositAddress;
    if (minDeposit !== undefined) adminConfig.minDeposit = parseFloat(minDeposit);
    if (tradingFeePercent !== undefined) adminConfig.tradingFeePercent = parseFloat(tradingFeePercent);
    if (bitgetApiKey) adminConfig.bitgetApiKey = bitgetApiKey;
    if (bitgetSecret) adminConfig.bitgetSecret = bitgetSecret;
    if (bitgetPassphrase) adminConfig.bitgetPassphrase = bitgetPassphrase;
    
    res.json({ success: true, message: 'Settings aur Bitget API keys successfully update ho gayi!' });
});

app.post('/api/admin/add-coin', (req, res) => {
    const { symbol, price } = req.body;
    if (!symbol || !price) return res.status(400).json({ success: false, message: 'Invalid coin data' });
    customCoins.push({ symbol: symbol.toUpperCase(), price: parseFloat(price) });
    res.json({ success: true, message: 'New coin add ho gaya!', coins: customCoins });
});

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

app.get('/api/user/account', (req, res) => {
    res.json({ 
        success: true, 
        account: userAccount, 
        depositAddress: adminConfig.depositAddress 
    });
});

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

// REAL BITGET SPOT EXCHANGE AUTOMATED TRADE ROUTE
app.post('/api/trade', async (req, res) => {
    const { symbol, side, amount, price } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Valid trade amount enter karein.' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Trade ke liye balance kam hai.' });
    }

    const fee = (amount * adminConfig.tradingFeePercent) / 100;
    const netInvestment = amount - fee;
    const coinSize = (netInvestment / price).toFixed(4);

    try {
        if (adminConfig.bitgetApiKey && adminConfig.bitgetSecret && adminConfig.bitgetPassphrase) {
            const method = 'POST';
            const requestPath = '/api/v2/spot/trade/place-order';
            
            const orderBody = {
                symbol: symbol.toUpperCase(),
                side: side.toLowerCase(),
                orderType: 'market',
                force: 'normal',
                size: coinSize,
                delegateAmount: coinSize
            };

            const { timestamp, signature } = signBitget(method, requestPath, orderBody, adminConfig.bitgetSecret);

            const bitgetRes = await fetch('https://api.bitget.com' + requestPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ACCESS-KEY': adminConfig.bitgetApiKey,
                    'ACCESS-SIGN': signature,
                    'ACCESS-TIMESTAMP': timestamp,
                    'ACCESS-PASSPHRASE': adminConfig.bitgetPassphrase,
                    'Locale': 'en_US'
                },
                body: JSON.stringify(orderBody)
            });

            const bitgetData = await bitgetRes.json();
            
            if (!bitgetData.code || bitgetData.code !== '00000') {
                throw new Error(bitgetData.msg || 'Bitget API rejected the order');
            }
        }

        userAccount.balance -= amount;
        userAccount.accumulatedFee += fee;
        userAccount.holdings += parseFloat(coinSize);
        userAccount.avgEntry = price;

        userAccount.tradeHistory.unshift({
            details: `Bitget Live: ${side} ${symbol} worth $${netInvestment.toFixed(2)} (Fee: $${fee.toFixed(2)})`,
            time: new Date().toLocaleTimeString()
        });

        res.json({ 
            success: true, 
            message: `Order successfully executed on Bitget Exchange! Fee: $${fee.toFixed(2)}`, 
            account: userAccount 
        });

    } code (error) { // Catch block
        console.error("Bitget Execution Error:", error.message);
        res.status(500).json({ 
            success: false, 
            message: `Bitget Error: ${error.message}` 
        });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
