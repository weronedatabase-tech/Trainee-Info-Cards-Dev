// ==========================================
// API ABSTRACTION LOGIC
// ==========================================

async function callBackend(action, payload = {}) {
 const url = ENV_CONFIG.URLS[ENV_CONFIG.ACTIVE_ENV];
 
 if (!url) {
   throw new Error(`Environment URL for ${ENV_CONFIG.ACTIVE_ENV} is missing.`);
 }

 // Construct a merged payload. Duplicate action/method to ensure all GAS versions detect it.
 const postData = { action: action, method: action, payload: payload || {}, ...(payload || {}) };

 try {
   // Use direct text/plain POST to bypass CORS preflight.
   // GAS will 302 redirect to a content server which returns proper CORS headers.
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
     throw new Error("Apps Script returned an HTML page. Ensure the Web App access is set to 'Anyone' and 'Execute as: Me'.");
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
   
   // A "Failed to fetch" error on a text/plain GAS request almost always means 
   // Google intercepted the request with a login redirect because permissions are wrong.
   if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
     msg = "Network request blocked. Ensure your Google Apps Script Web App is deployed with 'Execute as: Me' and 'Who has access: Anyone'.";
   }
   
   throw new Error(msg);
 }
}