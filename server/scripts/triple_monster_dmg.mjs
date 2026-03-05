import fs from 'fs';

const filePath = 'c:/Users/Cliente/Desktop/projetinho/Game/shared/monsters.js';
let content = fs.readFileSync(filePath, 'utf8');

// The file exports a MONSTERS object: export const MONSTERS = { "1": [...], "2": [...] }
// I'll parse it using a regex or simple string manipulation if it's strictly structured.
// Since it's a .js file with ESM export, I can't just JSON.parse it easily without stripping the export.

// Let's use a regex to find all damage fields within tier blocks >= 2.
// Actually, a safer way is to use a parser or just string replacement if I can identify the tiers.

const lines = content.split('\n');
let currentTier = null;
const newLines = lines.map(line => {
    // Check for tier key: "2": [
    const tierMatch = line.match(/^\s*"(\d+)":\s*\[/);
    if (tierMatch) {
        currentTier = parseInt(tierMatch[1]);
    }

    // Check for damage field: "damage": 2,
    if (currentTier >= 2) {
        const damageMatch = line.match(/^(\s*"damage":\s*)(\d+)(,?\s*)$/);
        if (damageMatch) {
            const oldValue = parseInt(damageMatch[2]);
            const newValue = oldValue * 3;
            console.log(`Tier ${currentTier}: Tripling damage from ${oldValue} to ${newValue}`);
            return `${damageMatch[1]}${newValue}${damageMatch[3]}`;
        }
    }

    return line;
});

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Finished updating damage for T2+ monsters.');
