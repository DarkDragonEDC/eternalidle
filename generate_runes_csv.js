
const fs = require('fs');
// Mocking the required shared/items.js imports since we can't easily require ES modules in this standalone script without package.json setup or .mjs extension.
// ACTUALLY: The previous script worked because I hardcoded the logic. I should do that again to avoid import issues.

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const RUNE_GATHER_ACTIVITIES = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'HERB', 'FISH'];
const RUNE_REFINE_ACTIVITIES = ['METAL', 'PLANK', 'LEATHER', 'CLOTH', 'EXTRACT'];
const RUNE_CRAFT_ACTIVITIES = ['WARRIOR', 'HUNTER', 'MAGE', 'TOOLS', 'COOKING', 'ALCHEMY'];
const RUNE_COMBAT_ACTIVITIES = ['ATTACK'];

const calculateRuneBonus = (tier, stars, effType = null) => {
    const starBonusMap = { 1: 1, 2: 3, 3: 5 };
    let bonus = (tier - 1) * 5 + (starBonusMap[stars] || stars);

    if (effType === 'SPEED' || effType === 'ATTACK') {
        bonus = Math.max(1, Math.floor(bonus / 2));
    }

    if (effType === 'SAVE_FOOD') {
        bonus = Math.max(1, Math.floor(bonus * 0.3));
    }

    if (effType === 'BURST') {
        bonus = Math.max(1, Math.floor(bonus * 0.4));
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
                    if (eff === 'COPY') effName = 'Duplication';
                    if (eff === 'SPEED') effName = 'Auto-Refine';
                    if (eff === 'EFF') effName = 'Efficiency';
                    if (eff === 'ATTACK') effName = 'Attack';
                    if (eff === 'SAVE_FOOD') effName = 'Food Saving';
                    if (eff === 'BURST') effName = 'Critical Chance';

                    if (act === 'FISH' && eff === 'SPEED') {
                        effName = 'Auto-Cooking';
                    }

                    const name = `T${t} ${actName} Rune of ${effName} (${s} Star)`;

                    let desc = '';
                    if (eff === 'SPEED') {
                        if (act === 'FISH') desc = `Chance to automatically cook raw fish while fishing by ${bonus}%`;
                        else desc = `Chance to automatically refine gathered materials by ${bonus}%`;
                    } else if (eff === 'EFF' || eff === 'ATTACK') {
                        desc = `Increases ${eff === 'EFF' ? 'speed' : 'damage'} by ${bonus}%`;
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

generateRunes(RUNE_GATHER_ACTIVITIES, ['XP', 'COPY', 'SPEED'], 'Gathering');
generateRunes(RUNE_REFINE_ACTIVITIES, ['XP', 'COPY', 'EFF'], 'Refining');
generateRunes(RUNE_CRAFT_ACTIVITIES, ['XP', 'COPY', 'EFF'], 'Crafting');
generateRunes(RUNE_COMBAT_ACTIVITIES, ['ATTACK', 'SAVE_FOOD', 'BURST'], 'Combat');

// Join with commas and CRLF
const csvContent = rows.map(row => row.join(',')).join('\r\n');

fs.writeFileSync('runes_list.csv', csvContent, 'utf8');
console.log('CSV file generated successfully for Google Sheets (Comma separated, Quoted).');
