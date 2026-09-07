// Fixed Bitget V2 Spot Market Order Route (Handling both amount & size)
app.post('/api/trade', async (req, res) => {
    try {
        const { apiKey, secretKey, passphrase, symbol, side, size } = req.body;

        if (!apiKey || !secretKey || !passphrase || !symbol || !side || !size) {
            return res.status(400).json({ success: false, error: 'Missing required trading parameters' });
        }

        const method = 'POST';
        const requestPath = '/api/v2/spot/trade/place-order';
        const host = 'https://api.bitget.com';

        const numericVal = parseFloat(size).toFixed(4).toString();

        const body = {
            symbol: symbol.toUpperCase(),
            side: side.toLowerCase(),
            orderType: 'market',
            force: 'gtc'
        };

        // Bitget V2 ke mutabiq buy aur sell dono ke liye parameters ko complete attach kar diya hai
        if (side.toLowerCase() === 'buy') {
            body.amount = numericVal;
            body.size = numericVal; // Kuch pairs par size bhi mandatory hota hai
        } else {
            body.size = numericVal;
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
