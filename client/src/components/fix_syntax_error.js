import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

// Replace the specific invalid patterns
content = content.replace(/\\`T\${tier}_\${m}\\`/g, '`T${tier}_${m}`');

fs.writeFileSync('GuildPanel.jsx', content);
console.log("GuildPanel.jsx syntax errors fixed.");
