const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

// Simple regex to find duplicate keys in object literals
// This is not perfect (doesn't handle nesting well) but can help find common duplicates
const objectRegex = /\{([^}]*)\}/g;
let match;
while ((match = objectRegex.exec(content)) !== null) {
    const objectContent = match[1];
    const keys = objectContent.split(',').map(pair => {
        const keyMatch = pair.match(/^\s*['"]?(\w+)['"]?\s*:/);
        return keyMatch ? keyMatch[1] : null;
    }).filter(k => k !== null);

    const seen = new Set();
    const duplicates = keys.filter(k => {
        if (seen.has(k)) return true;
        seen.add(k);
        return false;
    });

    if (duplicates.length > 0) {
        // console.log(`Potential duplicates in object fragment: ${duplicates.join(', ')}`);
        // console.log(objectContent);
        // console.log('---');
    }
}

console.log('Scan complete.');
