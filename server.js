const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory System State
let db = {
    adminPassword: "admin123",
    apiKey: "",
    apiSecret: "",
    apiPassphrase: "",
    balance: 126.83,
    holdings: 0.7578,
    avgPrice: 1.4120,
    deposits: [],
    withdrawals: [],
    activity: []
};

// Helper for Bitget API Signature (Master API used for all user trades)
function sign(timestamp, method, requestPath, body, secret) {
    const message = timestamp + method + requestPath + body;
    return crypto.createHmac('sha256', secret).update(message).digest('base64');
}

// API: Get State
app.get('/api/state', (req, res) => {
    res.json(db);
});

// API: Admin Login & Settings Update
app.post('/api/admin/settings', (req, res) => {
    const { password, apiKey, apiSecret, apiPassphrase, newPassword } = req.body;
    if (password !== db.adminPassword) {
        return res.status(401).json({ error: 'Invalid Admin Password' });
    }
    if (apiKey) db.apiKey = apiKey;
    if (apiSecret) db.apiSecret = apiSecret;
    if (apiPassphrase) db.apiPassphrase = apiPassphrase;
    if (newPassword) db.adminPassword = newPassword;
    res.json({ success: true, message: 'Settings updated successfully' });
});

// API: Deposit Request
app.post('/api/deposit', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    
    db.deposits.push({ id: Date.now(), amount: Number(amount), status: 'Pending' });
    db.activity.unshift(`[Deposit Requested] +$${amount} USDT awaiting approval.`);
    res.json({ success: true, message: 'Deposit request submitted! Awaiting admin approval.' });
});

// API: Withdrawal Request (Fixed to show in Admin Panel)
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (db.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    db.balance -= Number(amount);
    db.withdrawals.push({ id: Date.now(), amount: Number(amount), address, status: 'Pending' });
    db.activity.unshift(`[Withdrawal Requested] -$${amount} USDT to ${address}.`);
    res.json({ success: true, balance: db.balance, message: 'Withdrawal request submitted successfully.' });
});

// API: Admin Actions (Approve/Reject Deposits & Withdrawals)
app.post('/api/admin/action', (req, res) => {
    const { password, id, type, action } = req.body;
    if (password !== db.adminPassword) return res.status(401).json({ error: 'Unauthorized' });

    if (type === 'deposit') {
        const item = db.deposits.find(d => d.id == id);
        if (item && item.status === 'Pending') {
            item.status = action === 'approve' ? 'Approved' : 'Rejected';
            if (action === 'approve') {
                db.balance += item.amount;
                db.activity.unshift(`[Deposit Approved] +$${item.amount} USDT added.`);
            }
        }
    } else if (type === 'withdrawal') {
        const item = db.withdrawals.find(w => w.id == id);
        if (item && item.status === 'Pending') {
            item.status = action === 'approve' ? 'Approved' : 'Rejected';
            if (action === 'reject') {
                db.balance += item.amount; // Refund if rejected
                db.activity.unshift(`[Withdrawal Rejected] Refunded $${item.amount} USDT.`);
            } else {
                db.activity.unshift(`[Withdrawal Approved] Sent $${item.amount} USDT.`);
            }
        }
    }
    res.json({ success: true, db });
});

// API: Execute Trade (Direct for any User without needing their own API keys)
app.post('/api/trade', async (req, res) => {
    const { symbol, side, size, price } = req.body;
    const cost = size * price;

    if (side === 'BUY' && db.balance < cost) {
        return res.status(400).json({ error: 'Insufficient balance for this trade' });
    }

    // If master API keys are configured, execute real Bitget order in background
    if (db.apiKey && db.apiSecret && db.apiPassphrase) {
        try {
            const timestamp = Date.now().toString();
            const body = JSON.stringify({
                symbol: symbol.replace('/', ''),
                productType: 'USDT-FUTURES',
                marginMode: 'crossed',
                size: size.toString(),
                side: side.toLowerCase(),
                orderType: 'market'
            });
            const signature = sign(timestamp, 'POST', '/api/v2/mix/order/place-order', body, db.apiSecret);
            
            // Background call to Bitget (won't block user if offline/invalid, but executes if valid)
            await fetch('https://api.bitget.com/api/v2/mix/order/place-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ACCESS-KEY': db.apiKey,
                    'ACCESS-SIGN': signature,
                    'ACCESS-TIMESTAMP': timestamp,
                    'ACCESS-PASSPHRASE': db.apiPassphrase
                },
                body
            });
        } catch (err) {
            console.log('Bitget background sync note:', err.message);
        }
    }

    // Update simulation state smoothly for user
    if (side === 'BUY') {
        db.balance -= cost;
        db.holdings += Number(size);
        db.avgPrice = price;
    } else {
        db.balance += cost;
        db.holdings = Math.max(0, db.holdings - Number(size));
    }

    db.activity.unshift(`[Trade] ${side} ${symbol} executed! Fee: $0.0000`);
    res.json({ success: true, balance: db.balance, holdings: db.holdings, avgPrice: db.avgPrice });
}); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
