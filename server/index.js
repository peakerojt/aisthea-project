const express = require('express');
const app = express();
const PORT = 5000;

// API test đơn giản
app.get('/', (req, res) => {
    res.send('<h1>Backend Node.js đang chạy ổn định! 🚀</h1>');
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});