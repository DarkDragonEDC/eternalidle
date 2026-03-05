// Step 1: Extract CURRENT dungeon mob damage values
// Step 2: Restore the OLD monsters.js
// Step 3: Re-apply ONLY dungeon mob damage values

import { DUNGEONS } from './shared/dungeons.js';
import fs from 'fs';

// Get ALL dungeon mob IDs
const dungeonMobIds = new Set();
Object.values(DUNGEONS).forEach(dg => {
    if (dg.trashMobs) dg.trashMobs.forEach(id => dungeonMobIds.add(id));
    if (dg.bossId) dungeonMobIds.add(dg.bossId);
});

console.log(`Total dungeon mobs: ${dungeonMobIds.size}`);

// Read CURRENT file to extract new dungeon damage values
const currentFile = fs.readFileSync('./shared/monsters.js', 'utf-8');

// Extract damage for each dungeon mob from current file
const dungeonDamages = {};
for (const mobId of dungeonMobIds) {
    // Find the mob block by its id field, then extract the damage
    const pattern = new RegExp(`"id":\\s*"${mobId}"[^}]*?"damage":\\s*(\\d+)`, 's');
    const m = currentFile.match(pattern);
    if (m) {
        dungeonDamages[mobId] = parseInt(m[1]);
        console.log(`  ${mobId}: damage=${m[1]}`);
    } else {
        console.error(`  WARNING: Could not find ${mobId} in current file!`);
    }
}

// Read OLD file (the one before our changes)
const oldFile = fs.readFileSync('./shared/monsters_old.js', 'utf-8');

// Now apply dungeon damages onto the old file
let restoredFile = oldFile;
let applied = 0;
let failed = 0;

for (const [mobId, newDmg] of Object.entries(dungeonDamages)) {
    // In the old file, find the mob and replace its damage value
    const pattern = new RegExp(`("id":\\s*"${mobId}"[^}]*?"damage":\\s*)\\d+`, 's');
    const before = restoredFile;
    restoredFile = restoredFile.replace(pattern, `$1${newDmg}`);
    if (restoredFile !== before) {
        applied++;
    } else {
        console.error(`FAILED to apply damage for ${mobId}`);
        failed++;
    }
}

fs.writeFileSync('./shared/monsters.js', restoredFile, 'utf-8');
console.log(`\nDone! Applied ${applied} dungeon mob damages onto the old file.`);
if (failed > 0) console.error(`${failed} mobs failed to update.`);

// Verify by checking a few combat mob damage values
const verifyFile = fs.readFileSync('./shared/monsters.js', 'utf-8');
const oldVerify = fs.readFileSync('./shared/monsters_old.js', 'utf-8');

// Check first non-dungeon mob
const combatMobPattern = /"id":\s*"([^"]+)"[^}]*?"damage":\s*(\d+)/gs;
let verifyMatch;
let checked = 0;
let mismatches = 0;
while ((verifyMatch = combatMobPattern.exec(verifyFile)) !== null) {
    const id = verifyMatch[1];
    if (dungeonMobIds.has(id)) continue; // Skip dungeon mobs

    // Find same mob in old file
    const oldPattern = new RegExp(`"id":\\s*"${id}"[^}]*?"damage":\\s*(\\d+)`, 's');
    const oldMatch = oldVerify.match(oldPattern);
    if (oldMatch) {
        const newVal = parseInt(verifyMatch[2]);
        const oldVal = parseInt(oldMatch[1]);
        if (newVal !== oldVal) {
            console.error(`MISMATCH: ${id} -> current=${newVal}, old=${oldVal}`);
            mismatches++;
        }
    }
    checked++;
}
console.log(`Verified ${checked} combat mobs. Mismatches: ${mismatches}`);
