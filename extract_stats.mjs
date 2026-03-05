
import { MAGE_STATS_FIXED } from './shared/mage_stats_fixed.js';
import { PROFICIENCY_STATS } from './shared/proficiency_stats.js';

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUALITY = 2; // Outstanding

const results = {};

for (const t of TIERS) {
    const profLevel = t * 10;
    const profStats = PROFICIENCY_STATS.mage[profLevel];

    // Weapon (Fire Staff)
    const weapon = MAGE_STATS_FIXED["Fire Staff"][t][QUALITY];

    // Armor (Hat, Robe, Pants, Boots, Gloves)
    // I'll assume standard armor stats from MAGE_STATS_FIXED if they exist, 
    // or I'll just use the ones from the CSV I saw earlier.
    // Actually, let's just check MAGE_STATS_FIXED for armor.
}

console.log(JSON.stringify(MAGE_STATS_FIXED["Mage Robe"][1][2], null, 2));
