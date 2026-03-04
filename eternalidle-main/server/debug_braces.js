const fs = require('fs');
const content = fs.readFileSync('GameManager.js', 'utf8');
const lines = content.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Remove braces inside strings and comments
    const sanitized = line.replace(/\/\/.*$/g, '').replace(/\/\*.*?\*\//g, '').replace(/'.*?'/g, '').replace(/".*?"/g, '').replace(/`.*?`/g, '');
    for (const char of sanitized) {
        if (char === '{') count++;
        if (char === '}') {
            count--;
            if (count < 0) {
                console.log(`Line ${i + 1}: Negative brace count (${count}): "${line.trim()}"`);
            }
        }
    }
}
console.log(`Final count: ${count}`);
