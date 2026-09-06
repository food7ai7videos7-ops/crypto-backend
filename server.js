const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory storage for admin configuration and user state
let adminConfig = {
    depositAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE" // Default TRC20/USDT address
};

let userAccount = {
    balance: 0.00,
    holdings: 0.000000,
    avgEntry: 0.00,
    tradeHistory: []
};

// Admin Endpoints
app.get('/api/admin/config', (req, res) => {
    res.json({ success: true, depositAddress: adminConfig.depositAddress });
});

app.post('/api/admin/update-address', (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ success: false, message: 'Invalid address' });
    adminConfig.depositAddress = address;
    res.json({ success: true, message: 'Deposit address updated successfully!' });
});

// Get User Account Info
app.get('/api/user/account', (req, res) => {
    res.json({ success: true, account: userAccount });
});

// Deposit Endpoint
app.post('/api/deposit', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }
    userAccount.balance += parseFloat(amount);
    userAccount.tradeHistory.unshift({
        type: 'DEPOSIT',
        details: `Deposited $${amount}`,
        time: new Date().toLocaleTimeString()
    });
    res.json({ success: true, message: `Successfully deposited $${amount}`, newBalance: userAccount.balance });
});

// Withdraw Endpoint
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    if (!amount || amount <= 0 || !address) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal details' });
    }
    if (userAccount.balance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient USDT balance for withdrawal!' });
    }
    userAccount.balance -= parseFloat(amount);
    userAccount.tradeHistory.unshift({
        type: 'WITHDRAW',
        details: `Withdrew $${amount} to ${address.substring(0,6)}...`,
        time: new Date().toLocaleTimeString()
    });
    res.json({ success: true, message: `Withdrawal of $${amount} submitted successfully!` });
});

// Spot Trade Endpoint (With Margin Check)
app.post('/api/trade', (req, res) => {
    const { symbol, side, amount, price } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid trade amount.' });
    }

    if (userAccount.balance < amount) {
        return res.status(400).json({ 
            success: false, 
            message: `Insufficient Margin! Your balance is $${userAccount.balance.toFixed(2)}, but you tried to trade $${amount}. Please deposit funds first.` 
        });
    }

    // Deduct balance and execute trade
    userAccount.balance -= amount;
    const coinAmountGained = amount / price;
    userAccount.holdings += coinAmountGained;
    userAccount.avgEntry = price;

    userAccount.tradeHistory.unshift({
        type: side,
        details: `${side} ${amount} USDT worth of ${symbol} at $${price}`,
        time: new Date().toLocaleTimeString()
    });

    res.json({ 
        success: true, 
        message: `Order Executed Successfully! ${side} ${symbol} worth $${amount} filled at $${price}.`,
        account: userAccount 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
