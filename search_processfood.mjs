
import fs from 'fs';
const content = fs.readFileSync('./server/GameManager.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('processFood')) {
        console.log(`${i + 1}: ${line}`);
    }
});
