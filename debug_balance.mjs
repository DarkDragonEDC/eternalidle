
import fs from 'fs';

const playerStats = JSON.parse(fs.readFileSync('player_stats.json', 'utf8'));
const mobStats = JSON.parse(fs.readFileSync('dungeon_mobs.json', 'utf8'));

const dungeons = {
    1: ['ROCK_ELEMENTAL_T1', 'GIANT_SPIDER_T1', 'GOBLIN_KING', 'DG_RABBIT', 'BOSS_GOBLIN_SCOUT'],
    2: ['FOREST_SPIRIT', 'BANDIT_SCOUT', 'WOLF_ALPHA', 'DG_WOLF', 'BOSS_DIRE_RAT'],
    3: ['SKELETON', 'SKELETON_WARRIOR', 'BEAR_ANCIENT', 'DG_BEAR', 'BOSS_MOUNTAIN_GOBLIN'],
    4: ['UNDEAD_SOLDIER', 'CRYPT_WARDEN', 'SKELETON_KING', 'DG_DIRE_WOLF', 'BOSS_GHOST_KNIGHT'],
    5: ['LICH', 'LICH_LORD', 'OGRE_CHIEFTAIN', 'DG_OGRE', 'BOSS_WAR_OGRE'],
    6: ['FIRE_ELEMENTAL', 'INFERNAL_ELEMENTAL', 'TROLL_ELDER', 'DG_TROLL', 'BOSS_ARMORED_TROLL'],
    7: ['DARK_KNIGHT', 'DEATH_KNIGHT', 'DRAGON_MOTHER', 'DG_DRAGON_WHELP', 'BOSS_FIRE_DRAKE'],
    8: ['DEMON', 'DEMON_WARRIOR', 'GOLEM_PRIMORDIAL', 'DG_ANCIENT_GOLEM', 'BOSS_OBSIDIAN_GOLEM'],
    9: ['ARCHDEMON', 'ABYSSAL_FIEND', 'DEMON_PRINCE', 'DG_ELDER_DRAGON', 'BOSS_VOID_DRAGON'],
    10: ['DEMON_LORD', 'VOID_EXECUTIONER', 'VOID_ENTITY', 'DG_ANCIENT_DRAGON', 'BOSS_VOID_DRAGON_LORD']
};

function simulate(tier, player, mobDmgBase, healPerUse) {
    let currentHp = player.maxHP;
    let foodUsed = 0;
    let lastFoodAt = -5000;
    const playerMitigation = Math.min(0.75, player.defense / 10000);
    const mobIds = dungeons[tier];

    for (const mobId of mobIds) {
        const mob = mobStats[mobId];
        if (!mob) continue;
        const mobMitigation = mob.defense / (mob.defense + 36000);
        const finalPlayerDmg = Math.max(1, Math.floor(player.damage * (1 - mobMitigation)));
        const finalMobDmg = Math.max(1, Math.floor(mobDmgBase * (1 - playerMitigation)));

        let mHealth = mob.health;
        let timeElapsed = 0;
        let nextPAtk = 0;
        let nextMAtk = 500;

        while (mHealth > 0 && currentHp > 0 && timeElapsed < 1200000) { // 20 min cap
            const nextTick = Math.min(nextPAtk, nextMAtk);
            timeElapsed = nextTick;

            if (nextPAtk <= nextMAtk) {
                mHealth -= finalPlayerDmg;
                nextPAtk += player.attackSpeed;
            } else {
                currentHp -= finalMobDmg;
                nextMAtk += 1000;

                // Reactive heal
                if (currentHp < player.maxHP && (timeElapsed - lastFoodAt >= 5000)) {
                    currentHp = Math.min(player.maxHP, currentHp + healPerUse);
                    foodUsed++;
                    lastFoodAt = timeElapsed;
                }
            }
        }

        if (currentHp <= 0) return -1; // Death

        // Walking heal
        let walkingTime = Math.max(0, 60000 - timeElapsed);
        let walkingHeals = Math.floor(walkingTime / 5000);
        while (walkingHeals > 0 && currentHp < player.maxHP) {
            currentHp = Math.min(player.maxHP, currentHp + healPerUse);
            foodUsed++;
            walkingHeals--;
            lastFoodAt += 5000;
        }
    }
    return foodUsed;
}

const finalResults = [];
for (let t = 1; t <= 10; t++) {
    const player = playerStats[t];
    const healPerUse = Math.floor(player.maxHP * (0.05 * t));

    let low = 0;
    let high = 10000;
    let bestDmg = 0;
    let bestFood = 0;

    for (let i = 0; i < 20; i++) {
        let mid = Math.floor((low + high) / 2);
        let f = simulate(t, player, mid, healPerUse);

        if (f === -1) {
            high = mid - 1;
        } else if (f < 10) {
            low = mid + 1;
            bestDmg = mid;
            bestFood = f;
        } else {
            high = mid - 1;
            bestDmg = mid;
            bestFood = f;
        }
    }
    finalResults.push({ tier: t, dmg: bestDmg, food: bestFood });
}

console.log("TIER | MOB_DMG | FOOD");
finalResults.forEach(r => {
    console.log(`${r.tier} | ${r.dmg} | ${r.food.toFixed(1)}`);
});
