const fs = require('fs');
const files = ['/app/applet/server.js', '/app/applet/backend/code.js', '/app/applet/frontend/js/api.js', '/app/applet/frontend/js/admin.js'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    // Replace \` with `
    content = content.replace(/\\\`/g, '`');
    // Replace \$ with $
    content = content.replace(/\\\$/g, '$');
    // Replace \\n with \n in backend/code.js and admin.js where appropriate. 
    // Wait, replacing \\n with \n might break regexes. Let's just be careful.
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
