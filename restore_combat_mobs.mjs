// Restore combat mob damage values from the old monsters.js,
// keeping ONLY the new dungeon mob values.

import { DUNGEONS } from './shared/dungeons.js';
import fs from 'fs';

// Get ALL dungeon mob IDs
const dungeonMobIds = new Set();
Object.values(DUNGEONS).forEach(dg => {
    if (dg.trashMobs) dg.trashMobs.forEach(id => dungeonMobIds.add(id));
    if (dg.bossId) dungeonMobIds.add(dg.bossId);
});

console.log(`Dungeon mob IDs (${dungeonMobIds.size}):`, [...dungeonMobIds].slice(0, 10), '...');

// Read both files
const currentFile = fs.readFileSync('./shared/monsters.js', 'utf-8');
const oldFile = fs.readFileSync('./shared/monsters_old.js', 'utf-8');

// Extract damage values from old file using regex
// Pattern: id: 'MOB_ID' ... damage: NUMBER
const mobDamageRegex = /id:\s*['"]([^'"]+)['"][^}]*?damage:\s*(\d+)/gs;

const oldDamages = {};
let match;
while ((match = mobDamageRegex.exec(oldFile)) !== null) {
    oldDamages[match[1]] = parseInt(match[2]);
}

// Now find all mob IDs in current file and compare
const currentDamages = {};
const currentRegex = /id:\s*['"]([^'"]+)['"][^}]*?damage:\s*(\d+)/gs;
while ((match = currentRegex.exec(currentFile)) !== null) {
    currentDamages[match[1]] = parseInt(match[2]);
}

// Find combat mobs that were changed (not dungeon mobs)
const toRestore = [];
for (const [mobId, newDmg] of Object.entries(currentDamages)) {
    if (dungeonMobIds.has(mobId)) continue; // Skip dungeon mobs - keep new values
    const oldDmg = oldDamages[mobId];
    if (oldDmg !== undefined && oldDmg !== newDmg) {
        toRestore.push({ mobId, oldDmg, newDmg });
    }
}

console.log(`\nCombat mobs to restore: ${toRestore.length}`);
toRestore.forEach(m => console.log(`  ${m.mobId}: ${m.newDmg} -> ${m.oldDmg}`));

if (toRestore.length === 0) {
    console.log('\nNo combat mobs were changed! Nothing to restore.');
    process.exit(0);
}

// Apply restoration
let restoredFile = currentFile;
for (const { mobId, oldDmg, newDmg } of toRestore) {
    // Find the mob block and replace damage value
    // We need to be precise: find `id: 'MOB_ID'` then the next `damage: NUMBER`
    const blockRegex = new RegExp(
        `(id:\\s*['"]${mobId}['"][^}]*?damage:\\s*)${newDmg}`,
        's'
    );
    const before = restoredFile;
    restoredFile = restoredFile.replace(blockRegex, `$1${oldDmg}`);
    if (restoredFile === before) {
        console.error(`WARNING: Failed to restore ${mobId}`);
    }
}

fs.writeFileSync('./shared/monsters.js', restoredFile, 'utf-8');
console.log(`\nRestored ${toRestore.length} combat mob damage values!`);
