const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');
code = code.replace(
  /const CONSTANTS = \{[\s\S]*?INFO_COLUMN: 'Trainee Info Card Text'[\s\S]*?\};/,
  `const CONSTANTS = {
  get SPREADSHEET_ID() { return ENV_CONFIG.SHEETS[ENV_CONFIG.ACTIVE_ENV]; },
  get PHOTO_FOLDER_ID() { return ENV_CONFIG.DRIVE_FOLDER_ID; },
  SHEETS: {
    TRAINEE_INFO: 'TRAINEE INFO',
    SETTINGS: 'Settings'
  },
  INFO_COLUMN: 'Trainee Info Card Text'
};`
);
fs.writeFileSync('backend/Code.js', code);
console.log('Fixed CONSTANTS in Code.js');
