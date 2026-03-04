import fs from 'fs';
import { MAGE_STATS_FIXED } from '../shared/mage_stats_fixed.js';

const csvPath = 'mage_items_fixed.csv';

const header = 'Name,Tier,Rarity,IP,DMG,HP,DEF,SPEED,CRIT,GLOBAL_EFF\n';
let csvContent = header;

const qualityNames = ['Normal', 'Good', 'Outstanding', 'Excellent', 'Masterpiece'];

// Order of lookup names to maintain consistency if possible
const order = [
    'Fire Staff', 'Tome', 'Cloth Armor', 'Cloth Helmet', 'Cloth Boots', 'Cloth Gloves', 'Mage Cape'
];

function getBaseIP(tier) {
    return tier * 100;
}

for (const name of order) {
    const itemData = MAGE_STATS_FIXED[name];
    if (!itemData) continue;

    for (let t = 1; t <= 10; t++) {
        const tierData = itemData[t.toString()] || itemData[t];
        if (!tierData) continue;

        for (let q = 0; q <= 4; q++) {
            const stats = tierData[q.toString()] || tierData[q];
            if (!stats) continue;

            const rarity = qualityNames[q];
            const itemName = `${rarity} ${name}`;
            const ip = getBaseIP(t) + (q * 20) + (q === 4 ? 120 : 0); // Logic from other lookups

            // Format numbers: Use dot for thousands (if any) and comma for decimals?
            // User requested decimal as comma in previous examples
            const fmt = (val) => {
                if (val === undefined || val === null || val === 0) return '';
                let s = val.toString();
                if (s.includes('.')) {
                    return `"${s.replace('.', ',')}"`;
                }
                return s;
            };

            const row = [
                itemName,
                `T${t}`,
                rarity,
                ip,
                fmt(stats.damage),
                fmt(stats.hp),
                fmt(stats.defense),
                fmt(stats.speed),
                fmt(stats.crit || stats.critChance),
                fmt(stats.efficiency || stats.globalEff)
            ];

            csvContent += row.join(',') + '\n';
        }
    }
}

fs.writeFileSync(csvPath, csvContent);
console.log(`Successfully exported to ${csvPath}`);
