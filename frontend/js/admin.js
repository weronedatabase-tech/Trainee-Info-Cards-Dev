// ==========================================
// ADMIN SETTINGS
// ==========================================
function toggleSettingsModal(show) { 
  document.getElementById('modal-settings').classList.toggle('hidden', !show); 
}

function openAdminSettingsAuth(skipPass = false) {
  if (skipPass) {
     loadAdminDashboard();
  } else {
     document.getElementById('admin-pass').value = '';
     document.getElementById('admin-error-msg').classList.add('hidden');
     document.getElementById('password-modal').style.display = 'flex';
     setTimeout(() => { try { document.getElementById('admin-pass').focus(); } catch(e) {} }, 100);
  }
}

function closePasswordModal() {
  document.getElementById('password-modal').style.display = 'none';
}

async function handleAdminAuth() {
  const pass = document.getElementById('admin-pass').value;
  const btn = document.getElementById('btn-admin-login');
  if(!pass) return;

  btn.innerHTML = "Verifying..."; btn.disabled = true;
  try {
     const valid = await callBackend('verifySettingsPassword', { password: pass });
     if(valid) {
         closePasswordModal();
         loadAdminDashboard();
     } else { 
         document.getElementById('admin-error-msg').classList.remove('hidden'); 
     }
  } catch(e) { showToast(e.message, true); }
  btn.innerHTML = "Unlock"; btn.disabled = false;
}

function loadAdminDashboard() {
  toggleSettingsModal(true);
  populateTraineeSelect('admin-regen-select', true);
  
  if(!appData) return;
  const regDef = appData.appSettings.profileDefaultFieldMappings['Regular Volunteer'] ||[];
  const adhocDef = appData.appSettings.profileDefaultFieldMappings['Adhoc Volunteer / Exposure Session'] ||[];
  
  document.getElementById('settings-regular-fields').innerHTML = appData.availableFields.map(f => `<label><input type="checkbox" value="${f.label}" ${regDef.includes(f.label)?'checked':''}><span>${f.label}</span></label>`).join('');
  document.getElementById('settings-adhoc-fields').innerHTML = appData.availableFields.map(f => `<label><input type="checkbox" value="${f.label}" ${adhocDef.includes(f.label)?'checked':''}><span>${f.label}</span></label>`).join('');
  
  ['set-regPass', 'set-adhocPass', 'set-adminPass'].forEach(id => document.getElementById(id).value = '');
}

async function runAdminGeneration() {
  const sel = document.getElementById('admin-regen-select').value;
  const stat = document.getElementById('admin-regen-status');
  const btn = document.getElementById('btn-admin-gen');
  
  let list = sel === 'ALL' ? appData.allTrainees : [sel];
  if(list.length === 0) return;
  
  stat.classList.remove('hidden'); btn.disabled = true; btn.style.opacity = '0.5';
  
  for(let i=0; i<list.length; i++) {
     stat.innerText = `Processing ${i+1}/${list.length} : ${list[i]}`;
     try { await callBackend('adminGenerateCardText', { traineeName: list[i] }); }
     catch(e) { console.error("Failed for", list[i], e); }
  }
  
  stat.innerText = "Completed!";
  setTimeout(() => stat.classList.add('hidden'), 3000);
  btn.disabled = false; btn.style.opacity = '1';
}

async function handleSaveFieldSettings() {
  const newMappings = {
    "Regular Volunteer": Array.from(document.querySelectorAll('#settings-regular-fields input:checked')).map(cb => cb.value),
    "Adhoc Volunteer / Exposure Session": Array.from(document.querySelectorAll('#settings-adhoc-fields input:checked')).map(cb => cb.value)
  };
  showToast("Saving...", false);
  try {
    await callBackend('saveAppSettings', { newMappings });
    showToast("Field Settings Saved!");
  } catch(e) { showToast(e.message, true); }
}

async function handleSavePasswords() {
  const p = {
    'Regular Volunteer': document.getElementById('set-regPass').value,
    'Adhoc Volunteer': document.getElementById('set-adhocPass').value,
    'Settings': document.getElementById('set-adminPass').value
  };
  if(!p['Regular Volunteer'] && !p['Adhoc Volunteer'] && !p['Settings']) return showToast("No passwords entered.", true);
  
  showToast("Updating...", false);
  try {
    await callBackend('updatePasswords', { passwords: p });
    showToast("Passwords Updated!");
  } catch(e) { showToast(e.message, true); }
}
