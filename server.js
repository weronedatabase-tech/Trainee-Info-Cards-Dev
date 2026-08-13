const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files purely for local UI testing
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
 console.log(`Static server running on port ${PORT}. All API calls go directly to GAS.`);
});