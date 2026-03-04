
import fs from 'fs';
import path from 'path';

const filePath = '../shared/items.js';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const newLines = [
    ...lines.slice(0, 682),
    ...lines.slice(2537)
];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Fixed items.js');
