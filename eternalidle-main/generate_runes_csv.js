
const fs = require('fs');
// Mocking the required shared/items.js imports since we can't easily require ES modules in this standalone script without package.json setup or .mjs extension.
// ACTUALLY: The previous script worked because I hardcoded the logic. I should do that again to avoid import issues.

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RUNE_GATHER_ACTIVITIES = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'];
const RUNE_REFINE_ACTIVITIES = ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'];
const RUNE_CRAFT_ACTIVITIES = ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'];
const RUNE_COMBAT_ACTIVITIES = ['ATTACK'];

const calculateRuneBonus = (tier, stars, effType = null) => {
    // Non-Combat Scale (Gathering, Refining, Crafting): 1% to 20% over 30 steps (10 Tiers x 3 Stars)
    const isCombat = ['ATTACK', 'ATTACK_SPEED', 'SAVE_FOOD', 'BURST'].includes(effType);

    if (!isCombat) {
        const scale = [
            1, 1.66, 2.31, 2.97, 3.62, 4.28, 4.93, 5.59, 6.24, 6.9,
            7.55, 8.21, 8.86, 9.52, 10.17, 10.83, 11.48, 12.14, 12.79, 13.45,
            14.1, 14.76, 15.41, 16.07, 16.72, 17.38, 18.03, 18.69, 19.34, 20
        ];
        const index = (tier - 1) * 3 + (stars - 1);
        return scale[Math.min(scale.length - 1, Math.max(0, index))];
    }

    const starBonusMap = { 1: 1, 2: 3, 3: 5 }; // Max 3 stars
    let bonus = (tier - 1) * 5 + (starBonusMap[stars] || stars);

    // ATTACK (Combat) and ATTACK_SPEED runes: Specific linear growth requested by user
    if (effType === 'ATTACK' || effType === 'ATTACK_SPEED') {
        const combatBonusMap = {
            1: { 1: 0.5, 2: 1.2, 3: 1.8 },
            2: { 1: 2.5, 2: 3.2, 3: 3.9 },
            3: { 1: 4.5, 2: 5.2, 3: 5.9 },
            4: { 1: 6.6, 2: 7.2, 3: 7.9 },
            5: { 1: 8.6, 2: 9.2, 3: 9.9 },
            6: { 1: 10.6, 2: 11.3, 3: 11.9 },
            7: { 1: 12.6, 2: 13.3, 3: 14.0 },
            8: { 1: 14.6, 2: 15.3, 3: 16.0 },
            9: { 1: 16.6, 2: 17.3, 3: 18.0 },
            10: { 1: 18.7, 2: 19.3, 3: 20.0 }
        };
        const tierData = combatBonusMap[tier] || combatBonusMap[1];
        return tierData[stars] || tierData[1];
    }

    // Food Saving runes give 30% bonus (max ~15% instead of ~50%)
    if (effType === 'SAVE_FOOD') {
        bonus = Math.max(0.5, parseFloat((bonus * 0.3).toFixed(1)));
    }

    // BURST (Critical Strike) runes give 30% bonus (max 15% instead of ~50%)
    if (effType === 'BURST') {
        bonus = Math.max(0.5, parseFloat((bonus * 0.3).toFixed(1)));
    }

    return bonus;
};

// Helper to escape and quote CSV fields
const q = (str) => `"${String(str).replace(/"/g, '""')}"`;

const rows = [];
// Header
rows.push([q('Rune ID'), q('Name'), q('Tier'), q('Stars'), q('Activity'), q('Effect Type'), q('Bonus Value (%)'), q('Description')]);

function generateRunes(activities, effects, category) {
    activities.forEach(act => {
        effects.forEach(eff => {
            for (const t of TIERS) {
                for (let s = 1; s <= 3; s++) {
                    const id = `T${t}_RUNE_${act}_${eff}_${s}STAR`;
                    const bonus = calculateRuneBonus(t, s, eff);

                    let actName = act;
                    if (act === 'WOOD') actName = 'Woodcutting';
                    if (act === 'ORE') actName = 'Mining';
                    if (act === 'HIDE') actName = 'Skinning';
                    if (act === 'FIBER') actName = 'Fiber';
                    if (act === 'FISH') actName = 'Fishing';
                    if (act === 'HERB') actName = 'Herbalism';
                    if (act === 'METAL') actName = 'Metal';
                    if (act === 'PLANK') actName = 'Plank';
                    if (act === 'LEATHER') actName = 'Leather';
                    if (act === 'CLOTH') actName = 'Cloth';
                    if (act === 'EXTRACT') actName = 'Extract';
                    if (act === 'WARRIOR') actName = 'Warrior';
                    if (act === 'HUNTER') actName = 'Hunter';
                    if (act === 'MAGE') actName = 'Mage';
                    if (act === 'TOOLS') actName = 'Tools';
                    if (act === 'COOKING') actName = 'Cooking';
                    if (act === 'ALCHEMY') actName = 'Alchemy';
                    if (act === 'ATTACK') actName = 'Combat';

                    let effName = eff;
                    if (eff === 'XP') effName = 'XP';
                    if (eff === 'COPY' || eff === 'DUPLIC') effName = 'Duplication';
                    if (eff === 'SPEED' || eff === 'AUTO') effName = 'Auto-Refine';
                    if (eff === 'EFF') effName = 'Efficiency';
                    if (eff === 'ATTACK') effName = 'Attack';
                    if (eff === 'ATTACK_SPEED') effName = 'Attack Speed';
                    if (eff === 'SAVE_FOOD') effName = 'Food Saving';
                    if (eff === 'BURST') effName = 'Critical Chance';

                    if (act === 'FISH' && (eff === 'SPEED' || eff === 'AUTO')) {
                        effName = 'Auto-Cooking';
                    }

                    const name = `T${t} ${actName} Rune of ${effName} (${s} Star)`;

                    let desc = '';
                    if (eff === 'SPEED' || eff === 'AUTO') {
                        if (act === 'FISH') desc = `Chance to automatically cook raw fish while fishing by ${bonus}%`;
                        else desc = `Chance to automatically refine gathered materials by ${bonus}%`;
                    } else if (eff === 'EFF' || eff === 'ATTACK' || eff === 'ATTACK_SPEED') {
                        desc = `Increases ${eff === 'ATTACK_SPEED' ? 'attack speed' : (eff === 'EFF' ? 'speed' : 'damage')} by ${bonus}%`;
                    } else if (eff === 'COPY' || eff === 'DUPLIC') {
                        desc = `Increases chance to duplicate items by ${bonus}%`;
                    } else if (eff === 'SAVE_FOOD') {
                        desc = `Chance to consume no food when healing by ${bonus}%`;
                    } else if (eff === 'BURST') {
                        desc = `${bonus}% Chance to deal 1.5x damage on hit.`;
                    } else {
                        desc = `Increases ${actName} ${effName} by ${bonus}%`;
                    }

                    // Push quoted fields
                    rows.push([q(id), q(name), t, s, q(actName), q(effName), bonus, q(desc)]);
                }
            }
        });
    });
}

generateRunes(RUNE_GATHER_ACTIVITIES, ['XP', 'DUPLIC', 'AUTO'], 'Gathering');
generateRunes(RUNE_REFINE_ACTIVITIES, ['XP', 'DUPLIC', 'EFF'], 'Refining');
generateRunes(RUNE_CRAFT_ACTIVITIES, ['XP', 'DUPLIC', 'EFF'], 'Crafting');
generateRunes(RUNE_COMBAT_ACTIVITIES, ['ATTACK', 'ATTACK_SPEED', 'BURST', 'SAVE_FOOD'], 'Combat');

// Join with commas and CRLF
const csvContent = rows.map(row => row.join(',')).join('\r\n');

fs.writeFileSync('runes_list.csv', csvContent, 'utf8');
console.log('CSV file generated successfully for Google Sheets (Comma separated, Quoted).');
