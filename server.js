const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from root directory
app.use(express.static(__dirname));

// Root route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global storage for Vercel serverless to sync across devices
global.pendingDepositsStorage = global.pendingDepositsStorage || [];
global.userBalances = global.userBalances || {}; // User specific balances mapping

// Get live data endpoint for sync
app.get('/api/data', (req, res) => {
    const userId = req.query.userId || 'default_user';
    res.json({
        success: true,
        pendingDeposits: global.pendingDepositsStorage,
        balance: global.userBalances[userId] || 100.00, // Default demo/starting balance or 0
        adminProfit: global.adminProfitStorage || 0.01
    });
});

// Submit deposit endpoint from any device
app.post('/api/deposit', (req, res) => {
    const { amount, userId } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const targetUser = userId || 'default_user';
    const newDep = { id: Date.now(), userId: targetUser, amount: parseFloat(amount) };
    global.pendingDepositsStorage.push(newDep);
    res.json({ success: true, message: 'Deposit request submitted successfully' });
});

// Approve deposit endpoint (Credits balance to that specific user)
app.post('/api/approve-deposit', (req, res) => {
    const { index } = req.body;
    if (global.pendingDepositsStorage && global.pendingDepositsStorage[index]) {
        const dep = global.pendingDepositsStorage[index];
        const targetUser = dep.userId || 'default_user';
        
        // Add amount to specific user's balance
        global.userBalances[targetUser] = (global.userBalances[targetUser] || 100.00) + dep.amount;
        
        // Remove from pending
        global.pendingDepositsStorage.splice(index, 1);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: 'Invalid deposit index' });
});

// Bitget Signature Generator function
function createBitgetSignature(method, requestPath, body, timestamp, secretKey) {
    const message = timestamp + method.toUpperCase() + requestPath + (body ? JSON.stringify(body) : '');
    return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

// Bitget Trade Endpoint (Uses Vercel Environment Variables securely)
app.post('/api/trade', async (req, res) => {
    const { symbol, side, size } = req.body;
    
    // Fetch keys securely from Vercel Environment Variables
    const apiKey = process.env.BITGET_API_KEY;
    const secretKey = process.env.BITGET_SECRET;
    const passphrase = process.env.BITGET_PASSPHRASE;

    if (!apiKey || !secretKey || !passphrase) {
        return res.status(400).json({ success: false, error: 'Bitget API credentials not configured on server environment variables!' });
    }

    const method = 'POST';
    const requestPath = '/api/v2/spot/trade/place-order';
    const timestamp = Date.now().toString();

    const body = {
        symbol: symbol,
        productType: 'usdt-spot',
        side: side.toLowerCase(),
        orderType: 'market',
        size: size.toString(),
        force: 'gtc'
    };

    const sign = createBitgetSignature(method, requestPath, body, timestamp, secretKey);

    try {
        const response = await axios.post('https://api.bitget.com' + requestPath, body, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-PASSPHRASE': passphrase,
                'ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.code === '00000') {
            res.json({ success: true, data: response.data.data });
        } else {
            res.json({ success: false, error: response.data.msg || 'Bitget execution failed' });
        }
    } catch (error) {
        res.json({ success: false, error: error.response?.data?.msg || error.message });
    }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
