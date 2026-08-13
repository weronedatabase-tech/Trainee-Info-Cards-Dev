// ==========================================
// API ABSTRACTION LOGIC
// ==========================================

async function callBackend(action, payload = {}) {
 const url = ENV_CONFIG.URLS[ENV_CONFIG.ACTIVE_ENV];
 
 if (!url) {
   throw new Error(`Environment URL for ${ENV_CONFIG.ACTIVE_ENV} is missing.`);
 }

 // Exclusively use direct GAS fetching via text/plain to completely avoid Node Proxy hangs, 
 // payload stripping, and CORS preflight issues across all environments.
 return await callGasDirect(url, action, payload);
}

async function callGasDirect(url, action, payload = {}) {
 // Construct a merged payload. Duplicate action/method to ensure all GAS versions detect it.
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
     if (text.toLowerCase().includes('<html')) {
       throw new Error("GAS returned an HTML page. Ensure your script deployment access is set to 'Anyone'.");
     }
     throw new Error("Invalid response from server: " + text.substring(0, 60));
   }

   if (result.success === false) {
     throw new Error(result.error || 'Request failed');
   }
   if (result.status === 'error') {
     throw new Error(result.message || 'Request failed');
   }

   return result.data !== undefined ? result.data : result;
 } catch (err) {
   // Strip redundant "Error: " prefixes before throwing upward
   let msg = err.message || "Connection failed.";
   if (msg.startsWith("Error: ")) msg = msg.substring(7);
   throw new Error(msg);
 }
}