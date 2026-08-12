// ==========================================
// UI LOGIC
// ==========================================
function toggleTheme(save = true) {
  const isDark = document.documentElement.classList.toggle('dark');
  if (save) localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function togglePasswordIcon(btn, id) {
  const input = document.getElementById(id), i = btn.querySelector('i');
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  i.className = isPass ? 'ph-bold ph-eye text-xl' : 'ph-bold ph-eye-slash text-xl';
}

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  const msgEl = document.getElementById('toast-msg');
  msgEl.innerText = msg;
  
  el.className = `fixed top-12 left-1/2 transform -translate-x-1/2 glass-strong px-5 py-3 rounded shadow-2xl flex items-center gap-2 text-sm font-mono whitespace-nowrap transition-all duration-300 border`;
  
  if(isError) {
      el.classList.add("text-red-400", "border-red-500/50");
  } else {
      el.classList.add("text-indigo-400", "border-indigo-500/50");
  }
  
  if(window.tTimer) clearTimeout(window.tTimer);
  el.classList.remove('hidden');
  window.tTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

function setupEnvironmentUI() {
  const banner = document.getElementById('dev-banner');
  if (ENV_CONFIG.ACTIVE_ENV === 'DEV') {
      banner.style.display = 'block';
      banner.className = 'w-full bg-red-600 text-white text-[10px] py-1 text-center font-bold tracking-[0.3em] uppercase';
      banner.innerText = 'TESTING';
  } else if (ENV_CONFIG.ACTIVE_ENV === 'EXP') {
      banner.style.display = 'block';
      banner.className = 'w-full bg-purple-600 text-white text-[10px] py-1 text-center font-bold tracking-[0.3em] uppercase';
      banner.innerText = 'EXPERIMENTATION';
  } else {
      banner.style.display = 'none';
  }
}
