import { MONSTERS } from '../../shared/monsters.js';
import { PROFICIENCY_STATS } from '../../shared/proficiency_stats.js';
import { WARRIOR_STATS_FIXED } from '../../shared/warrior_stats_fixed.js';
import fs from 'fs';

// Qualities used for gear mapping
const QUALITIES = ['Normal', 'Good', 'Outstanding', 'Excellent', 'Masterpiece'];

// Re-calculate balanced stats internally to ensure precision and sync
const balancedStatsMap = {};

const MONSTERS_FLAT = [
    "RABBIT", "GOBLIN_SCOUT", "WILD_HOG", "FOX", "SNAKE",
    "WOLF", "DIRE_RAT", "STAG", "MOUNTAIN_GOAT", "BANDIT_THUG",
    "BEAR", "MOUNTAIN_GOBLIN", "HIGHLAND_COW", "HARPY", "ROGUE_KNIGHT",
    "DIRE_WOLF", "GHOST_KNIGHT", "SNOW_LEOPARD", "GIANT_EAGLE", "ASH_GHOUL",
    "OGRE", "WAR_OGRE", "SWAMP_TROC", "CRIMSON_BAT", "CORRUPTED_PALADIN",
    "TROLL", "ARMORED_TROLL", "TUNDRA_BEAR", "SKY_STALKER", "EXECUTIONER",
    "DRAGON_WHELP", "FIRE_DRAKE", "LAVA_HOUND", "STORM_WRAITH", "RUNE_GUARDIAN",
    "ANCIENT_GOLEM", "OBSIDIAN_GOLEM", "GLACIER_GIANT", "VOID_STALKER", "ABYSSAL_KNIGHT",
    "ELDER_DRAGON", "VOID_DRAGON", "NEBULA_SERPENT", "STAR_DEVOURER", "COSMIC_HORROR",
    "ANCIENT_DRAGON", "VOID_DRAGON_LORD", "GALAXY_EATER", "VOID_REAPER", "ETERNAL_WATCHER"
];

for (let i = 0; i < 50; i++) {
    const tier = Math.floor(i / 5) + 1;
    const qualityIdx = i % 5;
    const mobId = MONSTERS_FLAT[i];
    const profLvl = Math.min(100, (tier - 1) * 10 + (qualityIdx + 1) * 2);
    const runeBonusPc = 1 + (i / 49) * 19;
    const profData = PROFICIENCY_STATS.warrior[profLvl.toString()];

    let gearHP = 0;
    let gearDmg = 0;
    let gearDef = 0;
    let gearSpeed = 0;
    const pieces = ["Plate Helmet", "Plate Armor", "Plate Gloves", "Plate Boots", "Warrior Cape", "Sheath"];
    pieces.forEach(p => {
        const stats = WARRIOR_STATS_FIXED[p][tier.toString()][qualityIdx.toString()];
        if (stats.hp) gearHP += stats.hp;
        if (stats.defense) gearDef += stats.defense;
        if (stats.damage) gearDmg += stats.damage;
        if (stats.speed) gearSpeed += stats.speed;
    });
    const swordStats = WARRIOR_STATS_FIXED["Sword"][tier.toString()][qualityIdx.toString()];
    const weaponDmg = swordStats.damage;
    const weaponSpeed = swordStats.attackSpeed;

    const playerHP = 100 + profData.hp + gearHP;
    const playerDef = gearDef + profData.def;
    const totalRawDmg = profData.dmg + gearDmg + weaponDmg;
    const playerFinalDmg = Math.floor(totalRawDmg * (1 + (runeBonusPc / 100)));
    const baseReduction = weaponSpeed + gearSpeed + profData.speedBonus;
    const finalReduction = baseReduction * (1 + (runeBonusPc / 100));
    const playerAttackSpeedMs = Math.max(200, 2000 - finalReduction);

    const playerDPS = playerFinalDmg * (1000 / playerAttackSpeedMs);
    const targetMobHP = Math.floor(playerDPS * 10);
    const foodHealAmount = playerHP * (0.05 * tier);
    const playerMitigation = Math.min(0.75, playerDef / 10000);
    const mitigatedHitNeeded = foodHealAmount / 10;
    // Add 10% buffer to ensure it's "at least" 1 food
    const recommendedMobDmg = Math.ceil((mitigatedHitNeeded / (1 - playerMitigation)) * 1.1);

    balancedStatsMap[mobId] = {
        hp: targetMobHP,
        dmg: recommendedMobDmg
    };
}

const csvRows = ['ID,Name,Tier,HP,Damage,Defense,XP,Attack Speed (h/s),Silver Min,Silver Max,Loot'];

Object.keys(MONSTERS).forEach(tierKey => {
    const list = MONSTERS[tierKey];
    list.forEach(mob => {
        if (mob.dungeonOnly) return;

        // Check if we have balanced stats for this mob
        const balanced = balancedStatsMap[mob.id];
        const finalHP = balanced ? balanced.hp : mob.health;
        const finalDmg = balanced ? balanced.dmg : mob.damage;

        const lootStr = Object.entries(mob.loot || {})
            .map(([id, chance]) => `${id}: ${(chance * 100).toFixed(1)}%`)
            .join('; ');

        csvRows.push([
            mob.id,
            mob.name,
            mob.tier,
            finalHP,
            finalDmg,
            mob.defense,
            mob.xp,
            '1.00',
            mob.silver ? mob.silver[0] : 0,
            mob.silver ? mob.silver[1] : 0,
            `"${lootStr}"`
        ].join(','));
    });
});

fs.writeFileSync('combat_mobs_balanced.csv', csvRows.join('\n'));
console.log('✅ Comprehensive Balanced Mobs CSV generated: combat_mobs_balanced.csv');
