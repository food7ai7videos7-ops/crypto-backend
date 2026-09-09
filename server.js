const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database (Production ke liye isko MongoDB ya JSON file se replace kiya ja sakta hai)
let dbState = {
    config: {
        trc20: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        details: 'EasyPaisa: 0300-1234567 (Moosa Malik)',
        fee: '0.1'
    },
    deposits: [],
    withdrawals: [],
    balances: {},
    trades: []
};

// API: Get State
app.get('/api/state', (req, res) => {
    res.json({ success: true, data: dbState });
});

// API: Save Config (Admin)
app.use(express.static(__dirname));

app.post('/api/config', (req, res) => {
    const { trc20, details, fee, password } = req.body;
    if (password !== "Mmooossaa35") {
        return res.status(403).json({ success: false, message: 'Invalid Admin Password' });
    }
    if (trc20 !== undefined) dbState.config.trc20 = trc20;
    if (details !== undefined) dbState.config.details = details;
    if (fee !== undefined) dbState.config.fee = fee;
    res.json({ success: true, data: dbState });
});

// API: Submit Deposit Request
app.post('/api/deposit', (req, res) => {
    const { amount, userId } = req.body;
    if (!amount || amount <= 0 || !userId) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }
    dbState.deposits.push({
        amount: parseFloat(amount),
        userId,
        time: new Date().toLocaleTimeString()
    });
    res.json({ success: true, data: dbState });
});

// API: Submit Withdrawal Request
app.post('/api/withdraw', (req, res) => {
    const { amount, userId } = req.main || req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !userId) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }
    
    const userBal = dbState.balances[userId] || 0;
    if (userBal < amt) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    dbState.withdrawals.push({
        amount: amt,
        userId,
        time: new Date().toLocaleTimeString()
    });
    res.json({ success: true, data: dbState });
});

// API: Admin Actions (Approve/Reject)
app.post('/api/admin/action', (req, res) => {
    const { action, type, index, password } = req.body;
    if (password !== "Mmooossaa35") {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (type === 'deposit') {
        const dep = dbState.deposits[index];
        if (dep) {
            if (action === 'approve') {
                dbState.balances[dep.userId] = (dbState.balances[dep.userId] || 0) + dep.amount;
            }
            dbState.deposits.splice(index, 1);
        }
    } else if (type === 'withdrawal') {
        const w = dbState.withdrawals[index];
        if (w) {
            if (action === 'approve') {
                if ((dbState.balances[w.userId] || 0) >= w.amount) {
                    dbState.balances[w.userId] -= w.amount;
                }
            }
            dbState.withdrawals.splice(index, 1);
        }
    }

    res.json({ success: true, data: dbState });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
