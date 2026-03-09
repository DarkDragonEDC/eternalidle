import fs from 'fs';

const filePath = 'full_data_backup.sql';
const pos = 3814683;
const range = 5000;

const start = Math.max(0, pos - range);
const end = pos + range;

const buffer = Buffer.alloc(end - start);
const fd = fs.openSync(filePath, 'r');
fs.readSync(fd, buffer, 0, end - start, start);
fs.closeSync(fd);

fs.writeFileSync('error_chunk.sql', buffer.toString('utf8'));
console.log("Error chunk saved to error_chunk.sql");
