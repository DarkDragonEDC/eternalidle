
import fs from 'fs';

const mageData = fs.readFileSync('mage_full_data.js', 'utf8').replace('export const', 'const');
const itemsJs = fs.readFileSync('shared/items.js', 'utf8');

// Construct the new clean block
const newBlock = `
// --- MAGE GEAR (FIXED LOOKUP 12/02/26) ---
// Using exact values from CSV
${mageData}

const genMageGear = (slot, type, idSuffix, matType, lookupName) => {
    for (const t of TIERS) {
        const matId = \`T\${t}_\${matType}\`;
        const req = { [matId]: 20 };
        if (type === 'CAPE') req[\`T\${t}_CREST\`] = 1;

        // Default to Normal quality stats for the base item view
        const stats = MAGE_STATS_FIXED[lookupName][t][0];

        const gear = {
            id: \`T\${t}_\${idSuffix}\`,
            name: idSuffix.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            tier: t,
            req,
            xp: CRAFT_DATA.xp[t - 1],
            time: CRAFT_DATA.time[t - 1],
            ip: getBaseIP(t),
            type: type,
            stats,
            isMageLookup: true,
            lookupName: lookupName,
            description: \`A Tier \${t} \${idSuffix.replace(/_/g, ' ').toLowerCase()}. Specialized Mage gear.\`
        };

        if (!ITEMS.GEAR.MAGES_TOWER[slot]) ITEMS.GEAR.MAGES_TOWER[slot] = {};
        ITEMS.GEAR.MAGES_TOWER[slot][t] = gear;
    }
};

genMageGear('FIRE_STAFF', 'WEAPON', 'FIRE_STAFF', 'PLANK', 'Fire Staff');
genMageGear('TOME', 'OFF_HAND', 'TOME', 'CLOTH', 'Tome');
genMageGear('CLOTH_ARMOR', 'ARMOR', 'CLOTH_ARMOR', 'CLOTH', 'Cloth Armor');
genMageGear('CLOTH_HELMET', 'HELMET', 'CLOTH_HELMET', 'CLOTH', 'Cloth Helmet');
genMageGear('CLOTH_BOOTS', 'BOOTS', 'CLOTH_BOOTS', 'CLOTH', 'Cloth Boots');
genMageGear('CLOTH_GLOVES', 'GLOVES', 'CLOTH_GLOVES', 'CLOTH', 'Cloth Gloves');
genMageGear('CAPE', 'CAPE', 'MAGE_CAPE', 'CLOTH', 'Mage Cape');
`;

const markerStart = '// --- MAGE GEAR (FIXED LOOKUP 12/02/26) ---';
const markerEnd = '// --- TOOLMAKER ---';

const startIndex = itemsJs.indexOf(markerStart);
const endIndex = itemsJs.indexOf(markerEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found!');
    if (startIndex === -1) console.error('Start marker missing: ' + markerStart);
    if (endIndex === -1) console.error('End marker missing: ' + markerEnd);
    process.exit(1);
}

const newContent = itemsJs.slice(0, startIndex) + newBlock + '\n' + itemsJs.slice(endIndex);

fs.writeFileSync('shared/items.js', newContent, 'utf8');
console.log('Restored shared/items.js');
