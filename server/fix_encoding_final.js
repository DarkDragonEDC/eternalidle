import fs from 'fs';
const path = 'c:/Users/Cliente/Desktop/projetinho/eternalidle/server/GameManager.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the hourglass line using a regex that ignores the garbage characters
content = content.replace(/message \+= `.* \$\{timeStr\}`;/g, '        message += `⌛ ${timeStr}`;');

// Also fix any remaining mojibake for other emojis just in case
content = content.replace(/ðŸ’€/g, '💀');
content = content.replace(/âœ¨/g, '✨');
content = content.replace(/ðŸ’°/g, '💰');
content = content.replace(/ðŸ“¦/g, '📦');
content = content.replace(/â€¢/g, '•');
content = content.replace(/ðŸ“œ/g, '📜');

fs.writeFileSync(path, content, 'utf8');
console.log('Encoding fixed.');
