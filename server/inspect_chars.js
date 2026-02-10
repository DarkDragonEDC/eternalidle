import fs from 'fs';
const path = 'c:/Users/Cliente/Desktop/projetinho/eternalidle/server/GameManager.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const line = lines[1555]; // 0-indexed for 1556
console.log('Line 1556 content:', line);
console.log('Char codes:');
for (let i = 0; i < line.length; i++) {
    console.log(`char[${i}]: ${line[i]} (code: ${line.charCodeAt(i)})`);
}
