
import fs from 'fs';

const filePath = '../shared/items.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Line 683 is index 682
// Check if it is "};"
console.log('Line 683:', lines[682]);

if (lines[682].trim() === '};') {
    lines.splice(682, 1);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Removed line 683');
} else {
    console.log('Line 683 is not "};", skipping.');
}
