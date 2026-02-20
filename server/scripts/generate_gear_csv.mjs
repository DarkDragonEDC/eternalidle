import { InventoryManager } from '../managers/InventoryManager.js';
import { QUALITIES, resolveItem } from '../../shared/items.js';
import { PROFICIENCY_STATS } from '../../shared/proficiency_stats.js';
import fs from 'fs';

const invManager = new InventoryManager(null);

const csvRows = ['Class,Gear Tier,Rarity (Quality),Proficiency Lvl,Rune Tier & Stars,Damage,Defense,Attack Speed (h/s),Crit Burst Chance (%)'];

const CLASSES = ['warrior']; // Only calculate one class as they are perfectly equal
const WEAPON_MAP = { warrior: 'SWORD' };
const OFFHAND_MAP = { warrior: 'SHEATH' };
const ARMOR_MAP = { warrior: 'PLATE' };

for (const cls of CLASSES) {
    for (let t = 1; t <= 10; t++) {
        for (let q = 0; q <= 4; q++) {
            // Distribute runes properly: 
            // Total rows = 50. Row index: (t-1)*5 + q. Range: 0 to 49.
            const rowIndex = (t - 1) * 5 + q;

            // Proficiency advances realistically 1 by 1 or 2 by 2 across rows, up to 100
            // Row 0 = Lvl 1, Row 49 = Lvl 100.
            const profLvl = Math.min(100, Math.floor((rowIndex / 49) * 99) + 1);
            // 0 -> 1, 49 -> 30
            const runeLevel = Math.min(30, Math.floor((rowIndex / 49) * 29) + 1);
            const runeTier = Math.max(1, Math.ceil(runeLevel / 3));
            let runeStars = runeLevel % 3;
            if (runeStars === 0) runeStars = 3;

            const getStats = (id, qual) => {
                const fresh = resolveItem(id, qual);
                return fresh ? fresh.stats : {};
            };

            const wpnId = `T${t}_${WEAPON_MAP[cls]}`;
            const offId = `T${t}_${OFFHAND_MAP[cls]}`;
            const armorPrefix = `T${t}_${ARMOR_MAP[cls]}`;
            const getCapeId = (c) => {
                if (c === 'warrior') return `T${t}_PLATE_CAPE`;
                if (c === 'hunter') return `T${t}_LEATHER_CAPE`;
                return `T${t}_MAGE_CAPE`;
            };
            const capeId = getCapeId(cls);

            const char = {
                state: {
                    skills: { [`${cls.toUpperCase()}_PROFICIENCY`]: { level: profLvl } },
                    equipment: {
                        mainHand: { id: wpnId, quality: q, stars: null, stats: getStats(wpnId, q) },
                        offHand: { id: offId, quality: q, stars: null, stats: getStats(offId, q) },
                        chest: { id: `${armorPrefix}_ARMOR`, quality: q, stars: null, stats: getStats(`${armorPrefix}_ARMOR`, q) },
                        helmet: { id: `${armorPrefix}_HELMET`, quality: q, stars: null, stats: getStats(`${armorPrefix}_HELMET`, q) },
                        boots: { id: `${armorPrefix}_BOOTS`, quality: q, stars: null, stats: getStats(`${armorPrefix}_BOOTS`, q) },
                        gloves: { id: `${armorPrefix}_GLOVES`, quality: q, stars: null, stats: getStats(`${armorPrefix}_GLOVES`, q) },
                        cape: { id: capeId, quality: q, stars: null, stats: getStats(capeId, q) },

                        rune_ATTACK_ATTACK: { id: `T${runeTier}_RUNE_ATTACK_ATTACK_${runeStars}STAR`, stars: runeStars },
                        rune_ATTACK_ATTACK_SPEED: { id: `T${runeTier}_RUNE_ATTACK_ATTACK_SPEED_${runeStars}STAR`, stars: runeStars },
                        rune_ATTACK_BURST: { id: `T${runeTier}_RUNE_ATTACK_BURST_${runeStars}STAR`, stars: runeStars },
                    }
                }
            };

            // Re-implementing getProficiencyStats to avoid circular/ESM issues
            const profData = PROFICIENCY_STATS[cls]?.[profLvl.toString()] || { dmg: 0, hp: 0, def: 0, speedBonus: 0 };
            const activeProfDmg = profData.dmg || 0;
            const activeProfDefense = profData.def || 0;
            const activeSpeedBonus = profData.speedBonus || 0;

            const eq = char.state.equipment;
            const gearDamage = Object.values(eq).reduce((acc, item) => acc + (item?.stats?.damage || 0), 0);
            const gearDefense = Object.values(eq).reduce((acc, item) => acc + (item?.stats?.defense || 0), 0);
            const gearSpeedBonus = Object.values(eq).reduce((acc, item) => acc + (item?.stats?.speed || item?.stats?.attackSpeed || 0), 0);
            const gearCritChance = Object.values(eq).reduce((acc, item) => acc + (item?.stats?.critChance || 0), 0);
            const gearDmgBonus = Object.values(eq).reduce((acc, item) => acc + (item?.stats?.dmgBonus || 0), 0);

            // Fetching precise Rune Bonus data from game source mappings matching `items.js` calculateRuneBonus
            const combatBonusMap = {
                1: { 1: 0.5, 2: 1.2, 3: 1.8 }, 2: { 1: 2.5, 2: 3.2, 3: 3.9 }, 3: { 1: 4.5, 2: 5.2, 3: 5.9 },
                4: { 1: 6.6, 2: 7.2, 3: 7.9 }, 5: { 1: 8.6, 2: 9.2, 3: 9.9 }, 6: { 1: 10.6, 2: 11.3, 3: 11.9 },
                7: { 1: 12.6, 2: 13.3, 3: 14.0 }, 8: { 1: 14.6, 2: 15.3, 3: 16.0 }, 9: { 1: 16.6, 2: 17.3, 3: 18.0 },
                10: { 1: 18.7, 2: 19.3, 3: 20.0 }
            };

            const atkData = combatBonusMap[runeTier] || combatBonusMap[1];
            const atkRuneBonus = atkData[runeStars] || 0;
            const atkSpdRuneBonus = atkData[runeStars] || 0;

            // BURST (Critical Strike) runes give 30% of base formula Math.floor(((t-1)*5 + stars) * 0.3)
            let baseBurst = (runeTier - 1) * 5 + runeStars;
            let burstRuneBonus = Math.max(1, Math.floor(baseBurst * 0.3));

            // Exactly as displayed on "DAMAGE SOURCE" UI
            const rawDmgTotal = activeProfDmg + gearDamage;
            const finalDmgMultiplier = 1 + (atkRuneBonus / 100);
            const displayDmg = Math.floor(rawDmgTotal * finalDmgMultiplier);

            // Exactly as displayed on "DEFENSE SOURCE" UI
            const rawDefTotal = activeProfDefense + gearDefense;
            const displayDef = rawDefTotal; // UI doesn't multiply def by anything extra, just raw total.

            // Exactly as displayed on "SPEED SOURCE" UI
            const totalBaseReduction = gearSpeedBonus + activeSpeedBonus;
            const finalReduction = totalBaseReduction * (1 + (atkSpdRuneBonus / 100));

            // finalAttackSpeed is in ms. We convert to interval internally (1000/ms) or seconds. UI does: `Math.max(200, 2000 - finalReduction)`.
            const finalAttackSpeedMs = Math.max(200, 2000 - finalReduction);

            // Exactly as displayed on "CRÍTICO" UI
            const displayBurst = burstRuneBonus + gearCritChance;

            const rarityName = QUALITIES[q].name;

            const hitsPerSecond = (1000 / finalAttackSpeedMs).toFixed(2);
            csvRows.push(`${cls.toUpperCase()},T${t},${rarityName},Lvl ${profLvl},T${runeTier} (${runeStars} Star),${displayDmg},${displayDef},${hitsPerSecond},${displayBurst}`);
        }
    }
}

fs.writeFileSync('gear_combat_stats.csv', csvRows.join('\n'));
console.log('✅ Accurate CSV successfully generated: gear_combat_stats.csv');
