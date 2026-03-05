
import fs from 'fs';

const playerStats = JSON.parse(fs.readFileSync('player_stats.json', 'utf8'));
const mobStats = JSON.parse(fs.readFileSync('dungeon_mobs.json', 'utf8'));

const dungeons = {
    1: ['ROCK_ELEMENTAL_T1', 'GIANT_SPIDER_T1', 'GOBLIN_KING', 'DG_RABBIT', 'BOSS_GOBLIN_SCOUT']
};

function simulate(tier, player, mobDmgBase, healPerUse) {
    let currentHp = player.maxHP;
    let foodUsed = 0;
    let lastFoodAt = -5000;
    const playerMitigation = Math.min(0.75, player.defense / 10000);
    const mobIds = dungeons[tier];

    console.log(`Simulating Tier ${tier} with Mob DMG ${mobDmgBase}`);

    for (const mobId of mobIds) {
        const mob = mobStats[mobId];
        const mobMitigation = mob.defense / (mob.defense + 36000);
        const finalPlayerDmg = Math.max(1, Math.floor(player.damage * (1 - mobMitigation)));
        const finalMobDmg = Math.max(1, Math.floor(mobDmgBase * (1 - playerMitigation)));

        let mHealth = mob.health;
        let timeElapsed = 0;
        let nextPAtk = 10;
        let nextMAtk = 510;

        let startFood = foodUsed;

        while (mHealth > 0 && currentHp > 0) {
            const nextTick = Math.min(nextPAtk, nextMAtk);
            timeElapsed = nextTick;

            if (nextPAtk <= nextMAtk) {
                mHealth -= finalPlayerDmg;
                nextPAtk += player.attackSpeed;
            } else {
                currentHp -= finalMobDmg;
                nextMAtk += 1000;

                if (currentHp < player.maxHP && (timeElapsed - lastFoodAt >= 5000)) {
                    currentHp = Math.min(player.maxHP, currentHp + healPerUse);
                    foodUsed++;
                    lastFoodAt = timeElapsed;
                }
            }
        }
        console.log(`  Mob ${mobId}: Food used during fight: ${foodUsed - startFood}, currentHp: ${currentHp}`);

        let walkingTime = Math.max(0, 60000 - timeElapsed);
        let walkingHeals = Math.floor(walkingTime / 5000);
        let wStart = foodUsed;
        while (walkingHeals > 0 && currentHp < player.maxHP) {
            currentHp = Math.min(player.maxHP, currentHp + healPerUse);
            foodUsed++;
            walkingHeals--;
            lastFoodAt += 5000;
        }
        console.log(`  Mob ${mobId}: Food used during walking: ${foodUsed - wStart}, currentHp: ${currentHp}`);
    }
    return foodUsed;
}

const t1 = playerStats[1];
simulate(1, t1, 100, Math.floor(t1.maxHP * 0.05));
