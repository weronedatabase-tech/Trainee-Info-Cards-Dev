const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Proxy requests to Google Apps Script
app.post('/api/gas', async (req, res) => {
  try {
    const { action, payload, envUrl } = req.body;
    if (!envUrl) {
      return res.status(400).json({ success: false, error: 'envUrl is required' });
    }

    const response = await fetch(envUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload })
    });
    
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      // If the Apps Script returned plain text or HTML (e.g. an error page)
      return res.json({ success: false, error: "Failed to parse GAS response: " + text.substring(0, 100) });
    }
    
    if (result.status === 'error') {
      return res.json({ success: false, error: result.message });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
