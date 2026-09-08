const express = require('express');
const path = require('path');

const app = express();

// Middleware to parse JSON and serve static files from root directory
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Fallback route to serve index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
