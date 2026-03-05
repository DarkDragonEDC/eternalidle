
import fs from 'fs';

const playerStats = JSON.parse(fs.readFileSync('player_stats.json', 'utf8'));
const mobStats = JSON.parse(fs.readFileSync('dungeon_mobs.json', 'utf8'));

function simulate(tier, player, mobDmgBase, healPerUse) {
    let currentHp = player.maxHP;
    let foodUsed = 0;

    console.log(`Start: HP=${currentHp}, MaxHP=${player.maxHP}, HealPerUse=${healPerUse}`);

    const mobId = 'ROCK_ELEMENTAL_T1';
    const mob = mobStats[mobId];
    const mobMitigation = mob.defense / (mob.defense + 36000);
    const finalPlayerDmg = Math.max(1, Math.floor(player.damage * (1 - mobMitigation)));
    const finalMobDmg = Math.max(1, Math.floor(mobDmgBase * (1 - 0.015))); // Example mitigation

    let mHealth = mob.health;
    let timeElapsed = 0;
    let nextPAtk = 10;
    let nextMAtk = 510;
    let lastFoodAt = -5000;

    while (mHealth > 0 && currentHp > 0) {
        if (nextPAtk <= nextMAtk) {
            mHealth -= finalPlayerDmg;
            nextPAtk += player.attackSpeed;
        } else {
            currentHp -= finalMobDmg;
            nextMAtk += 1000;
            if (currentHp < player.maxHP && (nextMAtk - 1000 - lastFoodAt >= 5000)) {
                currentHp = Math.min(player.maxHP, currentHp + healPerUse);
                foodUsed++;
                lastFoodAt = nextMAtk - 1000;
            }
        }
    }

    console.log(`After Fight: HP=${currentHp}, FoodUsed=${foodUsed}`);

    let walkingTime = 60000 - 19300; // Example
    let walkingHeals = Math.floor(walkingTime / 5000);
    while (walkingHeals > 0) {
        console.log(`  Walking: healsLeft=${walkingHeals}, hp=${currentHp}, hp < max=${currentHp < player.maxHP}`);
        if (currentHp < player.maxHP) {
            currentHp = Math.min(player.maxHP, currentHp + healPerUse);
            foodUsed++;
        }
        walkingHeals--;
    }
    return foodUsed;
}

const p = playerStats[1];
simulate(1, p, 0, Math.floor(p.maxHP * 0.05));
