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
   if (!appData) {
       await dataPromise; // Ensure bg-load completed
       if (!appData) {
           // Retry fetching data if it failed during background initialization
           appData = await callBackend('getInitialData');
       }
   }
   
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
      
      populateTraineeSelect('trainee-select');
      document.getElementById('landing-page').style.display = 'none';
      document.getElementById('main-app-content').style.display = 'flex';
   } else {
      err.innerText = "Incorrect Password"; 
      err.classList.remove('hidden');
   }
 } catch(e) {
   btn.innerHTML = '<i class="ph-bold ph-sign-in"></i> Login'; 
   btn.disabled = false;
   err.innerText = "Error: " + e.message; 
   err.classList.remove('hidden');
 }
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