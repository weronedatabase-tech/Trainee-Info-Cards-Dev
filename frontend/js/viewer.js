// ==========================================
// VIEWER ENGINE
// ==========================================
function formatText(t) { 
  return String(t).replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
}

function populateTraineeSelect(id, includeAll = false) {
  if (!appData) return;
  const select = document.getElementById(id);
  select.innerHTML = (includeAll ? '<option value="ALL">All Trainees (Batch)</option>' : '<option value="" disabled selected>Select Trainee...</option>') 
                   + appData.allTrainees.map(t => `<option value="${t}">${t}</option>`).join('');
}

async function fetchTraineeInfo() {
  const name = document.getElementById('trainee-select').value;
  if (!name) return;
  
  document.getElementById('card-container').innerHTML = '';
  document.getElementById('loader-view').classList.remove('hidden');
  
  try {
     const data = await callBackend('getTraineeCardData', { traineeName: name, profile: currentProfile });
     document.getElementById('loader-view').classList.add('hidden');
     renderTraineeCard(data);
  } catch (e) {
     document.getElementById('loader-view').classList.add('hidden');
     showToast(e.message, true);
  }
}

function renderTraineeCard(data) {
  let html = `<div class="glass-strong p-6 rounded-2xl shadow-xl text-center mb-6 fade-in" style="border: 1px solid var(--glass-border);">`;
  
  if (data.photoBase64) {
      html += `<img src="data:${data.photoMime};base64,${data.photoBase64}" class="w-32 h-32 object-cover rounded-full mx-auto shadow-xl mb-4 p-1" style="border: 1px solid var(--glass-border); background-color: var(--input-bg);">`;
  } else {
      html += `<div class="w-32 h-32 rounded-full mx-auto shadow-inner mb-4 flex items-center justify-center theme-card"><i class="ph-bold ph-user text-5xl theme-text-muted"></i></div>`;
  }
  
  html += `<h2 class="text-2xl font-bold leading-tight mb-1">${formatText(data.fullName)}</h2></div>`;
  
  if (!data.categories || data.categories.length === 0) {
     html += `<div class="text-center theme-text-muted font-mono text-sm p-4 rounded-xl theme-card">No specific fields assigned for viewing.</div>`;
  } else {
     data.categories.forEach(cat => {
         let fieldsHtml = cat.fields.map(f => `<div class="mb-5 last:mb-0"><strong class="block text-[10px] font-bold theme-text-muted uppercase tracking-widest mb-1">${f.label}</strong><div class="text-[13px]">${formatText(f.value)}</div></div>`).join('');
         
         let borderColor = "var(--card-border)";
         html += `<details class="group rounded-xl shadow-lg mb-4 transition-all duration-300 fade-in theme-card" open>
                    <summary class="flex items-center gap-3 p-4 cursor-pointer select-none">
                      <i class="ph-fill ${cat.icon} ${cat.color} text-xl"></i>
                      <h3 class="font-bold flex-grow text-sm tracking-wide">${cat.title}</h3>
                      <i class="ph-bold ph-caret-down text-lg theme-text-muted chevron transition-transform"></i>
                    </summary>
                    <div class="px-5 pb-5 leading-relaxed pt-4 text-justify" style="border-top: 1px solid var(--glass-border);">
                      ${fieldsHtml}
                    </div>
                  </details>`;
     });
  }
  document.getElementById('card-container').innerHTML = html;
}
