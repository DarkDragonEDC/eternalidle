import fs from 'fs';
import readline from 'readline';

async function findTableAtPos() {
    const filePath = 'full_data_backup.sql';
    const targetPos = 3814683;
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentBytePos = 0;
    let currentTable = 'Unknown';
    let lastInsertLine = '';

    for await (const line of rl) {
        const lineByteSize = Buffer.byteLength(line, 'utf8') + 1; // +1 for newline
        const lineEnd = currentBytePos + lineByteSize;

        if (line.startsWith('-- Tabela:')) {
            currentTable = line.replace('-- Tabela:', '').trim();
        }

        if (targetPos >= currentBytePos && targetPos < lineEnd) {
            console.log(`Table at pos ${targetPos}: ${currentTable}`);
            console.log(`Line content: ${line}`);
            console.log(`Relative position in line: ${targetPos - currentBytePos}`);
            break;
        }

        currentBytePos = lineEnd;
    }
}

findTableAtPos();
