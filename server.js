// 100% Strict Bitget V2 Spot Market Order Route
app.post('/api/trade', async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase, symbol, side, size } = req.body;

        if (!apiKey || !secretKey || !passphrase || !symbol || !side || !size) {
            return res.status(400).json({ success: false, error: 'Missing required trading parameters' });
        }

        const method = 'POST';
        const requestPath = '/api/v2/spot/trade/place-order';
        const host = 'https://api.bitget.com';

        // Bitget V2 Spot Order Payload Structure
        const body = {
            symbol: symbol.toUpperCase(),
            side: side.toLowerCase(),
            orderType: 'market',
            force: 'gtc'
        };

        // BUY ke liye 'amount' (USDT), SELL ke liye 'size' (quantity)
        if (side.toLowerCase() === 'buy') {
            body.amount = parseFloat(size).toFixed(2).toString();
        } else {
            body.size = parseFloat(size).toFixed(4).toString();
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
        // Yeh line ab exact error print karegi ke Bitget server ne exactly kya waja di hai
        const errData = error.response?.data;
        const errorMsg = errData ? JSON.stringify(errData) : error.message;
        console.error('Bitget V2 Live Error:', errorMsg);
        
        res.status(400).json({ 
            success: false, 
            error: `Bitget API Error: ${errorMsg}` 
        });
    }
});
