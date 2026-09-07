const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function createBitgetSignature(method, requestPath, body, secretKey) {
    const timestamp = Date.now().toString();
    const bodyString = body ? JSON.stringify(body) : '';
    const preSignString = timestamp + method.toUpperCase() + requestPath + bodyString;
    const sign = crypto.createHmac('sha256', secretKey).update(preSignString).digest('base64');
    return { timestamp, sign };
}

// 100% Production Ready Real Bitget Trade Route
app.post('/api/trade', async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase, symbol, side, size } = req.body;

        if (!apiKey || !secretKey || !passphrase || !symbol || !side || !size) {
            return res.status(400).json({ success: false, error: 'Missing required trading parameters' });
        }

        const method = 'POST';
        const requestPath = '/api/v2/spot/trade/place-order';
        const host = 'https://api.bitget.com';

        const orderSide = side.toLowerCase();
        const formattedVal = parseFloat(size).toFixed(4).toString();

        const body = {
            symbol: symbol.toUpperCase(),
            side: orderSide,
            orderType: 'market',
            force: 'gtc',
            size: formattedVal // Bitget V2 market orders ke liye size parameter ab properly set hai
        };

        if (orderSide === 'buy') {
            body.amount = parseFloat(size).toFixed(2).toString();
        }

        const { timestamp, sign } = createBitgetSignature(method, requestPath, body, secretKey);

        const response = await axios.post(`${host}${requestPath}`, body, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-TIMESTAMP': timestamp,
                'ACCESS-PASSPHRASE': passphrase,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const errData = error.response?.data;
        const errorMsg = errData ? JSON.stringify(errData) : error.message;
        console.error('Bitget V2 Live Error:', errorMsg);
        
        res.status(400).json({ 
            success: false, 
            error: `Bitget API Error: ${errorMsg}` 
        });
    }
});

// Real Withdrawal Route
app.post('/api/withdraw', async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase, address, amount } = req.body;

        if (!apiKey || !secretKey || !passphrase || !address || !amount) {
            return res.status(400).json({ success: false, error: 'Missing withdrawal parameters' });
        }

        const method = 'POST';
        const requestPath = '/api/v2/spot/wallet/withdrawal';
        const host = 'https://api.bitget.com';

        const body = {
            coin: 'USDT',
            transferType: 'on_chain',
            address: address,
            amount: parseFloat(amount).toFixed(2).toString(),
            chain: 'TRC20'
        };

        const { timestamp, sign } = createBitgetSignature(method, requestPath, body, secretKey);

        const response = await axios.post(`${host}${requestPath}`, body, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-TIMESTAMP': timestamp,
                'ACCESS-PASSPHRASE': passphrase,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, data: response.data });
    } catch (error) {
        const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        res.status(400).json({ success: false, error: `Bitget Withdrawal Error: ${errorMsg}` });
    }
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
