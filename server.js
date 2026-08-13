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

   // Include redundant metadata tags (action, method) to ensure backward/forward compatibility with all GAS versions
   const postData = { action, method: action, payload: payload || {}, ...(payload || {}) };

   const gasResponse = await fetch(envUrl, {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
     body: JSON.stringify(postData),
     redirect: 'manual'
   });
   
   let text;
   // Handle Google's automatic 302 redirects for Web Apps manually to retain the payload structure
   if (gasResponse.status === 301 || gasResponse.status === 302 || gasResponse.status === 307) {
     const redirectUrl = gasResponse.headers.get('location');
     if (redirectUrl) {
       const redirectedResponse = await fetch(redirectUrl, { method: 'GET' });
       text = await redirectedResponse.text();
     } else {
       text = await gasResponse.text();
     }
   } else {
     text = await gasResponse.text();
   }

   let result;
   try {
     result = JSON.parse(text);
   } catch (e) {
     return res.json({ 
       success: false, 
       error: "Failed to parse GAS response: " + text.substring(0, 150) 
     });
   }
   
   if (result.success === false) {
     return res.json({ success: false, error: result.error || 'Request failed' });
   }
   if (result.status === 'error') {
     return res.json({ success: false, error: result.message || 'Request failed' });
   }
   if (result.success === true) {
     return res.json({ success: true, data: result.data });
   }
   if (result.status === 'success') {
     return res.json({ success: true, data: result.data || result });
   }
   
   res.json({ success: true, data: result });
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