// ==========================================
// API ABSTRACTION LOGIC
// ==========================================

async function callBackend(action, payload = {}) {
  // ENV_CONFIG is globally available from backend/config.js
  const url = ENV_CONFIG.URLS[ENV_CONFIG.ACTIVE_ENV];
  
  if (!url) {
      throw new Error(`Environment URL for ${ENV_CONFIG.ACTIVE_ENV} is missing.`);
  }

  // Use the local proxy to avoid CORS and 302 redirect issues
  const response = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, envUrl: url })
  });
  
  const text = await response.text();
  let result;
  
  try {
       result = JSON.parse(text);
   } catch(e) {
       throw new Error("Connection failed. Check permissions.");
   }
   
  if (!result.success) throw new Error(result.error);
  return result.data;
}
