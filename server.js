const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for Vercel serverless environment
let serverState = {
    pendingDeposits: [],
    adminProfit: 0.01
};

// Get live data endpoint for sync
app.get('/api/data', (req, res) => {
    res.json({ success: true, pendingDeposits: serverState.pendingDeposits, adminProfit: serverState.adminProfit });
});

// Submit deposit endpoint from any device
app.post('/api/deposit', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const newDep = { id: Date.now(), amount: parseFloat(amount) };
    serverState.pendingDeposits.push(newDep);
    res.json({ success: true, message: 'Deposit request submitted successfully' });
});

// Approve deposit endpoint
app.post('/api/approve-deposit', (req, res) => {
    const { index } = req.body;
    if (serverState.pendingDeposits && serverState.pendingDeposits[index]) {
        serverState.pendingDeposits.splice(index, 1);
        return res.json({ success: true });
    }
    res.status(400).json({ success: false, error: 'Invalid deposit index' });
});

// Bitget Signature Generator function
function createBitgetSignature(method, requestPath, body, timestamp, secretKey) {
    const message = timestamp + method.toUpperCase() + requestPath + (body ? JSON.stringify(body) : '');
    return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

// Bitget Trade Endpoint
app.post('/api/trade', async (req, res) => {
    const { apiKey, secretKey, passphrase, symbol, side, size } = req.body;
    
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

// Bitget Withdrawal Endpoint
app.post('/api/withdraw', async (req, res) => {
    const { apiKey, secretKey, passphrase, address, amount } = req.body;

    const method = 'POST';
    const requestPath = '/api/v2/spot/wallet/withdrawal';
    const timestamp = Date.now().toString();

    const body = {
        coin: 'USDT',
        transferType: 'on_chain',
        address: address,
        amount: amount.toString(),
        chain: 'usdt_trc20'
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
            res.json({ success: false, error: response.data.msg || 'Withdrawal failed' });
        }
    } catch (error) {
        res.json({ success: false, error: error.response?.data?.msg || error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
