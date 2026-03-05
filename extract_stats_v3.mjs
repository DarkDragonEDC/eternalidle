
import { MAGE_STATS_FIXED } from './shared/mage_stats_fixed.js';
import { PROFICIENCY_STATS } from './shared/proficiency_stats.js';
import fs from 'fs';

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUALITY = 2; // Outstanding

const playerStatsPerTier = {};

for (const t of TIERS) {
    const profLevel = t * 10;
    const prof = PROFICIENCY_STATS.mage[profLevel];

    let gearHP = 0;
    let gearDef = 0;
    let gearDmg = 0;
    let gearSpd = 0;

    const items = ["Mage Hat", "Mage Robe", "Mage Pants", "Mage Boots", "Mage Gloves", "Fire Staff"];

    items.forEach(name => {
        const itemTierData = MAGE_STATS_FIXED[name]?.[t];
        if (itemTierData) {
            const qData = itemTierData[QUALITY];
            if (qData) {
                gearHP += qData.hp || 0;
                gearDef += qData.defense || 0;
                gearDmg += qData.damage || 0;
                gearSpd += qData.attackSpeed || 0;
            }
        }
    });

    playerStatsPerTier[t] = {
        maxHP: 100 + prof.hp + gearHP,
        damage: prof.dmg + gearDmg,
        defense: prof.def + gearDef,
        attackSpeed: Math.max(200, 2000 - (prof.speedBonus + gearSpd))
    };
}

fs.writeFileSync('player_stats.json', JSON.stringify(playerStatsPerTier, null, 2), 'utf8');
