const express = require('express');
const http = require('http');
const WebSocket = require('server'); // Using standard express setup
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database simulation for trades, balances, and withdrawal requests
let systemState = {
    balance: 10000.00,
    openOrders: [],
    tradeHistory: [],
    deposits: [],
    withdrawals: []
};

// API: Get System State
app.get('/api/state', (req, res) => {
    res.json(systemState);
});

// API: Execute Trade (Spot)
app.use(express.urlencoded({ extended: true }));

app.post('/api/trade', (req, res) => {
    const { symbol, side, price, amount } = req.body;
    const total = price * amount;

    if (side === 'BUY' && systemState.balance < total) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    if (side === 'BUY') {
        systemState.balance -= total;
    } else {
        systemState.balance += total;
    }

    const newOrder = {
        id: Date.now(),
        symbol,
        side,
        price,
        amount,
        total,
        time: new Date().toLocaleTimeString(),
        status: 'Completed'
    };

    systemState.tradeHistory.unshift(newOrder);
    res.json({ success: true, order: newOrder, balance: systemState.balance });
});

// API: Request Withdrawal (Fixed issue from last night)
app.post('/api/withdraw', (req, res) => {
    const { amount, address } = req.body;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (systemState.balance < amount) {
        return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
    }

    // Deduct balance immediately upon request or hold until approval
    systemState.balance -= Number(amount);

    const withdrawalReq = {
        id: Date.now(),
        amount: Number(amount),
        address,
        status: 'Pending',
        time: new Date().toLocaleTimeString()
    };

    systemState.withdrawals.unshift(withdrawalReq);
    res.json({ success: true, message: 'Withdrawal request submitted successfully', balance: systemState.balance });
});

// API: Admin Action (Approve/Reject Withdrawals)
app.post('/api/admin/action', (req, res) => {
    const { id, action, type } = req.body; // type: 'withdrawal', action: 'approve'/'reject'
    
    if (type === 'withdrawal') {
        const item = systemState.withdrawals.find(w => w.id == id);
        if (item) {
            item.status = action === 'approve' ? 'Approved' : 'Rejected';
            if (action === 'reject') {
                // Refund balance if rejected
                systemState.balance += item.amount;
            }
        }
    }
    res.json({ success: true, state: systemState });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} 🚀`);
});
