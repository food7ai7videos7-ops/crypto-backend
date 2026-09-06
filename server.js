const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware (agar JSON data parse karna ho)
app.use(express.json());

// Root Route - Yeh aapki live website par show hoga
app.get('/', (req, res) => {
  res.send('Crypto Backend is Live and Running!');
});

// Agar aapke koi aur API routes hain, toh aap yahan niche add kar sakte hain:
// app.get('/api/data', (req, res) => { ... });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});