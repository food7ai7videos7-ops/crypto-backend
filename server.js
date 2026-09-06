const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection (Railway environment variables ya direct connection)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://<username>:<password>@cluster.mongodb.net/cryptoExchange?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB Connected Successfully for Real Trading!");
}).catch(err => {
    console.log("Database connection error: ", err);
});

// User Schema for Real Balances & Accounts
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    realUsdtBalance: { type: Number, default: 0.00 },
    trades: [{ symbol: String, type: String, amount: Number, price: Number, date: { type: Date, default: Date.now } }]
});

const User = mongoose.model('User', userSchema);

// Test Route
app.get('/', (req, res) => {
    res.send("Crypto Exchange Real-Money Backend is Live!");
});

// Register / Create User Account API
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        let existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const newUser = new User({ email, password, realUsdtBalance: 0 });
        await newUser.save();
        res.json({ message: "Account created successfully", user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User Balance API
app.get('/api/balance/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ realUsdtBalance: user.realUsdtBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});