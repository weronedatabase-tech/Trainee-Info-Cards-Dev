const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());

// Proxy requests to Google Apps Script to bypass local CORS restrictions
app.post('/api/gas', async (req, res) => {
 try {
   const { action, payload, envUrl } = req.body;
   if (!envUrl) {
     return res.status(400).json({ success: false, error: 'envUrl is required' });
   }

   // Format payload with redundant keys to ensure full compatibility with GAS parser
   const postData = { action: action, method: action, payload: payload || {}, ...(payload || {}) };

   // Utilize native Node 18 fetch. It natively handles Google's 302 redirects 
   // safely without dropping the original POST context.
   const response = await fetch(envUrl, {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
     body: JSON.stringify(postData),
     redirect: 'follow'
   });
   
   const text = await response.text();
   
   try {
     const result = JSON.parse(text);
     
     // Normalize GAS response structure
     if (result.success === false) {
       return res.json({ success: false, error: result.error || 'Request failed' });
     }
     if (result.status === 'error') {
       return res.json({ success: false, error: result.message || 'Request failed' });
     }
     
     res.json({ success: true, data: result.data !== undefined ? result.data : result });
   } catch (e) {
     // If GAS returns an HTML authorization or 404 page instead of JSON
     console.error("GAS returned non-JSON payload:", text.substring(0, 100));
     res.json({ 
       success: false, 
       error: "Google Apps Script returned an HTML page instead of data. Ensure you have run FORCE_AUTHORIZATION() in the script editor and deployed the Web App as 'Anyone'." 
     });
   }
 } catch (error) {
   console.error('Proxy error:', error);
   res.status(500).json({ success: false, error: "Local proxy network error: " + error.message });
 }
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/backend', express.static(path.join(__dirname, 'backend')));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
 console.log(`Server running on port ${PORT}`);
});