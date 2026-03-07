import fs from 'fs';
const content = fs.readFileSync('GameManager.js', 'utf8');
const lines = content.split('\n');
let open = 0;
let close = 0;
for (let i = 761; i <= 3500; i++) {
    const line = lines[i-1] || '';
    open += (line.match(/\{/g) || []).length;
    close += (line.match(/\}/g) || []).length;
}
console.log(`Open: ${open}, Close: ${close}`);
if (open !== close) {
    console.log("Difference found!");
}
