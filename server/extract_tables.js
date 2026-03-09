const fs = require('fs');
const readline = require('readline');

async function extractTables() {
    const fileStream = fs.createReadStream('full_data_backup.sql');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const tables = new Set();
    for await (const line of rl) {
        if (line.startsWith('-- Tabela:')) {
            const tableName = line.replace('-- Tabela: ', '').trim();
            tables.add(tableName);
        }
    }
    console.log(JSON.stringify(Array.from(tables), null, 2));
}

extractTables().catch(console.error);
