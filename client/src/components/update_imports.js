import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');
content = content.replace(/Pickaxe, Lock/g, 'Pickaxe, Lock, FlaskConical');
fs.writeFileSync('GuildPanel.jsx', content);
console.log("Imports updated.");
