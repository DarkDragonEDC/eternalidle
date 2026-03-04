import { PROFICIENCY_STATS } from '../../shared/proficiency_stats.js';
import { WARRIOR_STATS_FIXED } from '../../shared/warrior_stats_fixed.js';
import fs from 'fs';

// Qualities used for gear
const QUALITIES = [
    { id: 0, name: 'Normal' },
    { id: 1, name: 'Good' },
    { id: 2, name: 'Outstanding' },
    { id: 3, name: 'Excellent' },
    { id: 4, name: 'Masterpiece' }
];

const MONSTERS = [
    // T1
    "RABBIT", "GOBLIN_SCOUT", "WILD_HOG", "FOX", "SNAKE",
    // T2
    "WOLF", "DIRE_RAT", "STAG", "MOUNTAIN_GOAT", "BANDIT_THUG",
    // T3
    "BEAR", "MOUNTAIN_GOBLIN", "HIGHLAND_COW", "HARPY", "ROGUE_KNIGHT",
    // T4
    "DIRE_WOLF", "GHOST_KNIGHT", "SNOW_LEOPARD", "GIANT_EAGLE", "ASH_GHOUL",
    // T5
    "OGRE", "WAR_OGRE", "SWAMP_TROC", "CRIMSON_BAT", "CORRUPTED_PALADIN",
    // T6
    "TROLL", "ARMORED_TROLL", "TUNDRA_BEAR", "SKY_STALKER", "EXECUTIONER",
    // T7
    "DRAGON_WHELP", "FIRE_DRAKE", "LAVA_HOUND", "STORM_WRAITH", "RUNE_GUARDIAN",
    // T8
    "ANCIENT_GOLEM", "OBSIDIAN_GOLEM", "GLACIER_GIANT", "VOID_STALKER", "ABYSSAL_KNIGHT",
    // T9
    "ELDER_DRAGON", "VOID_DRAGON", "NEBULA_SERPENT", "STAR_DEVOURER", "COSMIC_HORROR",
    // T10
    "ANCIENT_DRAGON", "VOID_DRAGON_LORD", "GALAXY_EATER", "VOID_REAPER", "ETERNAL_WATCHER"
];

const csvRows = ['Mob ID,Tier,Quality,Prof Lvl,Player HP,Player Dmg,Player Def,Player Speed(h/s),Mob HP (Recommended),Mob Dmg (Recommended)'];

for (let i = 0; i < 50; i++) {
    const tier = Math.floor(i / 5) + 1;
    const qualityIdx = i % 5;
    const quality = QUALITIES[qualityIdx];
    const mobId = MONSTERS[i];

    // 1. Calculate Prof Lvl (T1: 1-10, T2: 11-20, T3: 21-30, T4: 31-40, T5+: 41-100)
    // This aligns with user's "I should be level 39" at Tier 4
    const profLvl = Math.min(100, (tier - 1) * 10 + (qualityIdx + 1) * 2);

    // 2. Rune Bonus (1% to 20% linear)
    const runeBonusPc = 1 + (i / 49) * 19;

    // 3. Player Stats (Warrior/Plate Set)
    const profData = PROFICIENCY_STATS.warrior[profLvl.toString()];
    const activeProfDmg = profData.dmg;
    const activeProfHP = profData.hp;
    const activeProfDef = profData.def;
    const activeProfSpeed = profData.speedBonus;

    // Piece HP/Dmg/Def/Speed from WARRIOR_STATS_FIXED
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

    // Final Player Stats
    const playerHP = 100 + activeProfHP + gearHP;
    const playerDef = gearDef + activeProfDef;

    // Damage: (Prof Dmg + Gear Dmg + Weapon Dmg) * (1 + Rune Bonus)
    // Actually, in InventoryManager, gearDmg includes everything equipped.
    const totalRawDmg = activeProfDmg + gearDmg + weaponDmg;
    const playerFinalDmg = Math.floor(totalRawDmg * (1 + (runeBonusPc / 100)));

    // Speed: Math.max(200, 2000 - (weaponSpeed + gearSpeed + activeProfSpeed)) * (1 + Rune Bonus)
    // Note: Rune Bonus for speed is also distributed? The gear script used it.
    const baseReduction = weaponSpeed + gearSpeed + activeProfSpeed;
    const finalReduction = baseReduction * (1 + (runeBonusPc / 100));
    const playerAttackSpeedMs = Math.max(200, 2000 - finalReduction);
    const playerHPS = (1000 / playerAttackSpeedMs).toFixed(2);

    // 4. Mob Requirements
    // Player DPS
    const playerDPS = playerFinalDmg * (1000 / playerAttackSpeedMs);

    // Requirement: 10 seconds to die
    // Note: Player damage is mitigated by mob defense. Let's assume Mob Defense = 0 or a base value for calculations.
    // Setting Mob Defense to 0 for "survive 10s of raw DPS" or we can set it to a tier-based value.
    // User didn't specify mob defense changes, so let's stick to 0 defense for easier HP targeting.
    const targetMobHP = Math.floor(playerDPS * 10);

    // Requirement: Force 1 food of corresponding tier
    // Food Tier t heals 5*t % of playerHP
    const foodHealAmount = playerHP * (0.05 * tier);

    // Player Mitigation
    const playerMitigation = Math.min(0.75, playerDef / 10000);

    // Mob attacks 10 times in 10 seconds (1 hit per 1000ms)
    // 10 * floor(MobDmg * (1 - PlayerMitigation)) = foodHealAmount
    // floor(MobDmg * (1 - PlayerMitigation)) = foodHealAmount / 10
    const mitigatedHitNeeded = foodHealAmount / 10;
    // Add 10% buffer to ensure it's "at least" 1 food
    const recommendedMobDmg = Math.ceil((mitigatedHitNeeded / (1 - playerMitigation)) * 1.1);

    csvRows.push([
        mobId,
        tier,
        quality.name,
        profLvl,
        Math.floor(playerHP),
        playerFinalDmg,
        playerDef,
        playerHPS,
        targetMobHP,
        recommendedMobDmg
    ].join(','));
}

fs.writeFileSync('balanced_mobs_stats.csv', csvRows.join('\n'));
console.log('✅ Balanced Mobs CSV generated: balanced_mobs_stats.csv');
