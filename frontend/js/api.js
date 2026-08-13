// ==========================================
// API ABSTRACTION LOGIC
// ==========================================

async function callBackend(action, payload = {}) {
 const url = ENV_CONFIG.URLS[ENV_CONFIG.ACTIVE_ENV];
 
 if (!url) {
   throw new Error(`Environment URL for ${ENV_CONFIG.ACTIVE_ENV} is missing.`);
 }

 // Detect static hosting environments (e.g. GitHub Pages) where /api/gas proxy is unavailable
 const isStaticHost = window.location.hostname.includes('github.io') || 
                      window.location.hostname.includes('web.app') ||
                      window.location.hostname.includes('firebaseapp.com') ||
                      window.location.protocol === 'file:';

 if (isStaticHost) {
   return await callGasDirect(url, action, payload);
 }

 // Try local proxy endpoint (/api/gas) if running on local Node server
 try {
   const response = await fetch('/api/gas', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action, payload, envUrl: url })
   });

   if (response.ok) {
     const text = await response.text();
     let result;
     try {
       result = JSON.parse(text);
     } catch (e) {
       // Proxy returned non-JSON HTML (e.g. 404 page), fall back to direct GAS call
       return await callGasDirect(url, action, payload);
     }

     if (result.success === false) {
       throw new Error(result.error || 'Operation failed');
     }
     if (result.status === 'error') {
       throw new Error(result.message || 'Operation failed');
     }

     return result.data !== undefined ? result.data : result;
   }
 } catch (e) {
   if (e.message && e.message !== 'Operation failed' && !e.message.includes('fetch') && !e.message.includes('Unexpected token')) {
     throw e;
   }
 }

 // Fallback to direct call
 return await callGasDirect(url, action, payload);
}

async function callGasDirect(url, action, payload = {}) {
 // Construct a merged payload compatible with all GAS doPost implementations
 const postData = { action, payload: payload || {}, ...(payload || {}) };

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
     throw new Error("Unable to parse Google Apps Script response. Check web app authorization and deployment permissions.");
   }

   if (result.success === false) {
     throw new Error(result.error || 'Request failed');
   }
   if (result.status === 'error') {
     throw new Error(result.message || 'Request failed');
   }

   return result.data !== undefined ? result.data : result;
 } catch (err) {
   if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
     throw new Error("Connection failed. Check Google Apps Script deployment permissions (Access must be set to 'Anyone').");
   }
   throw err;
 }
}