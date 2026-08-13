// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
async function handleGeneralLogin() {
 const pass = document.getElementById('general-password-input').value;
 const err = document.getElementById('general-login-error');
 const btn = document.getElementById('general-login-btn');
 
 err.classList.add('hidden');
 
 if(!pass) {
     err.innerText = "Please enter a password.";
     err.classList.remove('hidden');
     return;
 }

 btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Verifying...'; 
 btn.disabled = true;

 try {
   // Authenticate immediately. DO NOT block on dataPromise here.
   const profile = await callBackend('login', { password: pass });
   
   btn.innerHTML = '<i class="ph-bold ph-sign-in"></i> Login'; 
   btn.disabled = false;
   
   if (profile === 'Settings') return openAdminSettingsAuth(true);
   
   if (profile) {
      currentProfile = profile;
      
      // Update and show user badge
      const badge = document.getElementById('user-badge');
      badge.innerText = profile;
      badge.className = profile === 'Regular Volunteer' 
         ? 'self-start text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-green-900/20 text-green-400 border-green-500/30'
         : 'self-start text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-amber-900/20 text-amber-400 border-amber-500/30';
      badge.classList.remove('hidden');
      
      // Show logout button
      document.getElementById('btn-logout').classList.remove('hidden');
      
      // Transition UI to main app
      document.getElementById('landing-page').style.display = 'none';
      document.getElementById('main-app-content').style.display = 'flex';
      
      // Now ensure background data is loaded in the main UI without freezing the login button
      await ensureDataLoaded();
   } else {
      err.innerText = "Incorrect Password"; 
      err.classList.remove('hidden');
   }
 } catch(e) {
   btn.innerHTML = '<i class="ph-bold ph-sign-in"></i> Login'; 
   btn.disabled = false;
   
   let msg = e.message || String(e);
   if (msg.startsWith("Error: ")) msg = msg.substring(7);
   
   err.innerText = "Error: " + msg; 
   err.classList.remove('hidden');
 }
}

async function ensureDataLoaded() {
 const container = document.getElementById('card-container');
 const select = document.getElementById('trainee-select');
 
 // If appData isn't ready yet, show skeleton loading state in the main UI
 if (!appData) {
    container.innerHTML = `
      <div class="text-center py-16 fade-in glass-strong rounded-2xl border" style="border-color: var(--glass-border);">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p class="theme-text-muted text-sm animate-pulse font-mono tracking-widest uppercase">Syncing Database...</p>
      </div>`;
      
    try {
       await dataPromise; 
       if (!appData) {
           appData = await callBackend('getInitialData');
       }
    } catch (e) {
       container.innerHTML = `
         <div class="text-red-500 text-center py-10 font-bold glass-strong rounded-2xl border border-red-500/30">
           Failed to load database. Please refresh the app.
         </div>`;
       return;
    }
    
    container.innerHTML = '';
 }
 
 populateTraineeSelect('trainee-select');
}

function logout() {
 currentProfile = '';
 document.getElementById('general-password-input').value = '';
 document.getElementById('card-container').innerHTML = '';
 document.getElementById('trainee-select').value = '';
 
 // Hide badge and logout button
 document.getElementById('user-badge').classList.add('hidden');
 document.getElementById('btn-logout').classList.add('hidden');
 
 document.getElementById('main-app-content').style.display = 'none';
 document.getElementById('landing-page').style.display = 'flex';
}