// ==========================================
// BACKGROUND DATA LOAD & INITIALIZATION
// ==========================================
let appData = null;
let currentProfile = '';
let dataPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initiate Data Load Early
    dataPromise = callBackend('getInitialData')
        .then(d => { appData = d; return d; })
        .catch(e => console.error(e));

    // 2. Configure Dynamic Environment specific UI
    setupEnvironmentUI();
    
    // 3. Load user theme preference
    const saved = localStorage.getItem('theme'); if (saved === 'dark' || !saved) { if(!saved) localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
    }
});
