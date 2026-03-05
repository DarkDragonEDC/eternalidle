
import fs from 'fs';
const content = fs.readFileSync('./shared/items.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('.FOOD[')) {
        console.log(`${i + 1}: ${line}`);
    }
});
