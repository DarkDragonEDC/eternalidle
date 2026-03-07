import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

// Fix all escaped backticks and dollar signs that were incorrectly inserted by the script
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('GuildPanel.jsx', content);
console.log("GuildPanel.jsx backslash errors fixed.");
