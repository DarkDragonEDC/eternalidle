import fs from 'fs';
const content = fs.readFileSync('GameManager.js', 'utf8');
for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode > 127) {
        console.log(`Non-ASCII at char ${i}: Code ${charCode} ('${content[i]}')`);
        console.log(`Context: ${content.substring(Math.max(0, i-20), Math.min(content.length, i+20))}`);
    }
}
