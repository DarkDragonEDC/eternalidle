
const fs = require('fs');

const gearStats = JSON.parse(fs.readFileSync('C:/Users/Administrator/Desktop/Jogo/eternalidle/tmp/gear_stats.json', 'utf8'));

// The lookupNames used in items.js must match the keys in the stats files exactly.
// Warrior: genWarriorGear calls use these lookupNames:
//   'Sword', 'Sheath', 'Plate Armor', 'Plate Helmet', 'Plate Boots', 'Plate Gloves', 'Warrior Cape'
// Hunter: genHunterGear calls use:
//   'Bow', 'Torch', 'Leather Armor', 'Leather Helmet', 'Leather Boots', 'Leather Gloves', 'Leather Cape'
// Mage: genMageGear calls use:
//   'Fire Staff', 'Tome', 'Cloth Armor', 'Cloth Helmet', 'Cloth Boots', 'Cloth Gloves', 'Mage Cape'

const filesToUpdate = [
    {
        path: 'C:/Users/Administrator/Desktop/Jogo/eternalidle/shared/warrior_stats_fixed.js',
        varName: 'WARRIOR_STATS_FIXED',
        mapping: {
            'Sword': 'Sword',
            'Sheath': 'Sheath',
            'Plate Armor': 'Plate Armor',
            'Plate Helmet': 'Plate Helmet',
            'Plate Boots': 'Plate Boots',
            'Plate Gloves': 'Plate Gloves',
            'Plate Cape': 'Warrior Cape'    // CSV says "Plate Cape", items.js expects "Warrior Cape"
        }
    },
    {
        path: 'C:/Users/Administrator/Desktop/Jogo/eternalidle/shared/mage_stats_fixed.js',
        varName: 'MAGE_STATS_FIXED',
        mapping: {
            'Sword': 'Fire Staff',          // CSV "Sword" -> items.js expects "Fire Staff"
            'Sheath': 'Tome',
            'Plate Armor': 'Cloth Armor',
            'Plate Helmet': 'Cloth Helmet',
            'Plate Boots': 'Cloth Boots',
            'Plate Gloves': 'Cloth Gloves',
            'Plate Cape': 'Mage Cape'       // CSV "Plate Cape" -> items.js expects "Mage Cape"
        }
    },
    {
        path: 'C:/Users/Administrator/Desktop/Jogo/eternalidle/shared/hunter_stats_fixed.js',
        varName: 'HUNTER_STATS_FIXED',
        mapping: {
            'Sword': 'Bow',
            'Sheath': 'Torch',              // CSV "Sheath" -> items.js expects "Torch"
            'Plate Armor': 'Leather Armor',
            'Plate Helmet': 'Leather Helmet',
            'Plate Boots': 'Leather Boots',
            'Plate Gloves': 'Leather Gloves',
            'Plate Cape': 'Leather Cape'
        }
    }
];

filesToUpdate.forEach(fileConfig => {
    let newStats = {};
    
    for (const [csvName, gameName] of Object.entries(fileConfig.mapping)) {
        if (gearStats[csvName]) {
            newStats[gameName] = gearStats[csvName];
        } else {
            console.warn(`WARNING: Missing data for '${csvName}' in gear_stats.json`);
        }
    }

    const content = `export const ${fileConfig.varName} = ${JSON.stringify(newStats, null, 4)};`;
    fs.writeFileSync(fileConfig.path, content);
    console.log(`Updated ${fileConfig.path} - Keys: ${Object.keys(newStats).join(', ')}`);
});
