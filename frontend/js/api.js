// ==========================================
// API ABSTRACTION LOGIC
// ==========================================

async function callBackend(action, payload = {}) {
 const url = ENV_CONFIG.URLS[ENV_CONFIG.ACTIVE_ENV];
 
 if (!url) {
   throw new Error(`Environment URL for ${ENV_CONFIG.ACTIVE_ENV} is missing.`);
 }

 const isStaticHost = window.location.hostname.includes('github.io') || 
                      window.location.hostname.includes('web.app') ||
                      window.location.hostname.includes('firebaseapp.com') ||
                      window.location.protocol === 'file:';

 // If running locally with Node, route through the proxy to avoid strict browser CORS preflights
 if (!isStaticHost) {
   try {
     const response = await fetch('/api/gas', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action, payload, envUrl: url })
     });

     if (response.ok) {
       const result = await response.json();
       if (result.success === false) {
         throw new Error(result.error || 'Operation failed');
       }
       return result.data;
     }
   } catch (e) {
     // If the proxy itself returned a properly formatted error message, throw it up to the UI
     if (e.message && !e.message.includes('Failed to fetch') && !e.message.includes('Unexpected token')) {
       throw e;
     }
     // If the proxy is entirely unreachable, fall through to attempt direct GAS connection
   }
 }

 // Fallback directly to Google Apps Script (will work on static hosts like GitHub Pages)
 return await callGasDirect(url, action, payload);
}

async function callGasDirect(url, action, payload = {}) {
 const postData = { action: action, method: action, payload: payload || {}, ...(payload || {}) };

 try {
   const response = await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'text/plain;charset=utf-8' },
     body: JSON.stringify(postData),
     redirect: 'follow'
   });

   const text = await response.text();
   let result;
   
   try {
     result = JSON.parse(text);
   } catch (e) {
     throw new Error("Apps Script returned an HTML page. Ensure the Web App access is set to 'Anyone'.");
   }

   if (result.success === false) {
     throw new Error(result.error || 'Request failed');
   }
   if (result.status === 'error') {
     throw new Error(result.message || 'Request failed');
   }

   return result.data !== undefined ? result.data : result;
 } catch (err) {
   let msg = err.message || "Connection failed.";
   
   // Clean up double errors
   if (msg.startsWith("Error: ")) {
       msg = msg.substring(7);
   }
   
   // Translate raw browser fetch failures into user-friendly text
   if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
     msg = "Network request blocked (CORS). If developing locally, ensure the Node proxy is running.";
   }
   
   throw new Error(msg);
 }
}