const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve static HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Deposit Endpoint
app.post('/api/deposit', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }
    // Yahan aap Bitget API ya apna database logic likh sakte hain
    console.log(`Deposit requested: ${amount} USDT`);
    res.json({ success: true, message: 'Deposit processed successfully', newBalance: amount });
});

// Withdraw Endpoint
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    if (!amount || !address) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal details' });
    }
    // Yahan withdraw API integration aayegi
    console.log(`Withdraw requested: ${amount} USDT to ${address}`);
    res.json({ success: true, message: 'Withdrawal request submitted successfully' });
});

// Spot Trade Endpoint
app.post('/api/trade', (req, res) => {
    const { symbol, side, amount, price } = req.body;
    console.log(`Trade Execution: ${side} ${amount} of ${symbol} at ${price}`);
    // Yahan Bitget API key ke sath real order placement ka code aayega
    res.json({ success: true, message: 'Trade executed successfully on Bitget' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
