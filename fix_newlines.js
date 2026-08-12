const fs = require('fs');
let code = fs.readFileSync('/app/applet/backend/code.js', 'utf8');
code = code.replace(/\\\\n/g, '\\n');
code = code.replace(/\\\\r/g, '\\r');
fs.writeFileSync('/app/applet/backend/code.js', code);
console.log('Fixed newlines');
