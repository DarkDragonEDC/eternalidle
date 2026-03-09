import fs from 'fs';

const filePath = 'full_data_backup.sql';
const pos = 3814683;

const fd = fs.openSync(filePath, 'r');
const stats = fs.statSync(filePath);

// Read a large chunk around the position to find the start and end of the line
const startSearch = Math.max(0, pos - 2000);
const buffer = Buffer.alloc(4000);
fs.readSync(fd, buffer, 0, 4000, startSearch);
fs.closeSync(fd);

const text = buffer.toString('utf8');
const lines = text.split('\n');

// Find the line that spans the relative position
let currentPos = startSearch;
for (const line of lines) {
    const lineEnd = currentPos + Buffer.byteLength(line, 'utf8') + 1; // +1 for \n
    if (pos >= currentPos && pos < lineEnd) {
        console.log(`--- Line containing pos ${pos} ---`);
        console.log(line);
        console.log(`--- Position details ---`);
        const relPos = pos - currentPos;
        console.log(`Relative pos in line: ${relPos}`);
        console.log(`Char at pos: ${line[relPos]}`);
        break;
    }
    currentPos = lineEnd;
}
