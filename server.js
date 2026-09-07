const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (index.html, CSS, etc.) directly from root
app.use(express.static(path.join(__dirname)));

// Bitget API V2 Signature Generation Helper
function createBitgetSignature(method, requestPath, body, secretKey) {
    const timestamp = Date.now().toString();
    const bodyString = body ? JSON.stringify(body) : '';
    const preSignString = timestamp + method.toUpperCase() + requestPath + bodyString;
    const sign = crypto.createHmac('sha256', secretKey).update(preSignString).digest('base64');
    return { timestamp, sign };
}

// Order Execution Endpoint
app.post('/api/trade', async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase, symbol, side, size } = req.body;

        if (!apiKey || !secretKey || !passphrase || !symbol || !side || !size) {
            return res.status(400).json({ success: false, error: 'Missing required trading parameters' });
        }

        const method = 'POST';
        const requestPath = '/api/v2/spot/trade/place-order';
        const host = 'https://api.bitget.com';

        const body = {
            symbol: symbol,
            productType: 'USDT-FUTURES',
            marginMode: 'crossed',
            side: side.toLowerCase(),
            orderType: 'market',
            size: size.toString(),
            force: 'gtc'
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
        console.error('Bitget API Error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.message || error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Vercel Serverless Function Export
module.exports = app;
