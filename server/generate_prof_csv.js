
import fs from 'fs';

const HEADERS = [
    'Level',
    'Warrior_DMG', 'Warrior_HP', 'Warrior_DEF', 'Warrior_SpeedBonus',
    'Hunter_DMG', 'Hunter_HP', 'Hunter_DEF', 'Hunter_SpeedBonus',
    'Mage_DMG', 'Mage_HP', 'Mage_DEF', 'Mage_SpeedBonus'
];

const rows = [HEADERS.join(',')];

for (let lvl = 1; lvl <= 100; lvl++) {
    // InventoryManager.js logic:
    // const activeProfDmg = activeProf === 'warrior' ? warriorProf * 1200 : activeProf === 'hunter' ? hunterProf * 1200 : activeProf === 'mage' ? mageProf * 2600 : 0;
    // const activeHP = activeProf === 'warrior' ? warriorProf * 10000 : activeProf === 'hunter' ? hunterProf * 8750 : activeProf === 'mage' ? mageProf * 7500 : 0;
    // const activeSpeedBonus = activeProf === 'hunter' ? hunterProf * 3.6 : activeProf === 'mage' ? mageProf * 3.33 : activeProf === 'warrior' ? warriorProf * 3.33 : 0;
    // const activeProfDefense = activeProf === 'hunter' ? hunterProf * 25 : activeProf === 'mage' ? mageProf * 12.5 : activeProf === 'warrior' ? warriorProf * 37.5 : 0;

    // Note: warriorProf/hunterProf/mageProf are likely treated as levels here based on the multiplier usage.

    const row = [
        lvl,
        // Warrior
        Math.round(lvl * 1200),
        Math.round(lvl * 10000),
        parseFloat((lvl * 37.5).toFixed(1)),
        parseFloat((lvl * 3.33).toFixed(2)),
        // Hunter
        Math.round(lvl * 1200),
        Math.round(lvl * 8750),
        parseFloat((lvl * 25).toFixed(1)),
        parseFloat((lvl * 3.6).toFixed(2)),
        // Mage
        Math.round(lvl * 2600),
        Math.round(lvl * 7500),
        parseFloat((lvl * 12.5).toFixed(1)),
        parseFloat((lvl * 3.33).toFixed(2))
    ];

    rows.push(row.join(','));
}

const outputPath = 'proficiencies_levels_buffs.csv';
fs.writeFileSync(outputPath, rows.join('\n'));
console.log(`CSV generated at ${outputPath}`);
