/**
 * Shared survival time calculation logic for Eternal Idle.
 * Accounts for:
 * - Player and Mob Mitigation (0.75 cap)
 * - Food Healing and Cooldown (5s)
 * - Mob Respawn (1s delay)
 * - Idle Limit (8h normal / 12h premium)
 */

export const calculateSurvivalTime = (playerStats, mobData, foodItem, foodAmount, currentHp, isPremium = false) => {
    if (!mobData) return { seconds: Infinity, text: "∞", color: "#4caf50" };

    const maxHp = playerStats.hp || 100;
    const defense = playerStats.defense || 0;
    const playerDmg = playerStats.damage || 1;
    const playerAtkSpeed = Math.max(200, playerStats.attackSpeed || 1000);

    const mobMaxHp = mobData.health || 100;
    const mobBaseDmg = mobData.damage || 1;
    const mobDef = mobData.defense || 0;
    const mobAtkSpeed = 1000; // Server constant

    // Mitigation
    const playerMitigation = Math.min(0.75, defense / 10000);
    const mobMitigation = Math.min(0.75, mobDef / 10000);

    // Dmg per hit
    const dmgToMob = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));
    const dmgToPlayer = Math.max(1, Math.floor(mobBaseDmg * (1 - playerMitigation)));

    // Fight Dynamics
    const hitsToKillMob = Math.ceil(mobMaxHp / dmgToMob);
    const fightDurationMs = hitsToKillMob * playerAtkSpeed;
    const totalCycleMs = fightDurationMs + 1000; // +1s respawn
    const mobAttacksPerCycle = Math.max(1, Math.floor(fightDurationMs / mobAtkSpeed));
    const dmgPerCycle = mobAttacksPerCycle * dmgToPlayer;

    // Food Healing
    let unitHeal = 0;
    if (foodItem) {
        if (foodItem.healPercent) {
            unitHeal = Math.floor(maxHp * (foodItem.healPercent / 100));
        } else {
            unitHeal = foodItem.heal || 0;
        }
    }
    if (unitHeal < 1) unitHeal = 0;

    // Max potential healing per cycle (5s cooldown)
    const maxHealsPerCycle = Math.floor(totalCycleMs / 5000) || (totalCycleMs > 0 ? 0.2 : 0); // Handle cycles < 5s as fraction
    const potentialHealPerCycle = maxHealsPerCycle * unitHeal;

    const idleLimitSeconds = (isPremium ? 12 : 8) * 3600;

    // SCENARIO A: Damage per cycle is 0 or less (Impossible, but for safety)
    if (dmgPerCycle <= 0) return { seconds: Infinity, text: "∞", color: "#4caf50" };

    // SCENARIO B: Damage > Potential Heal (Losing HP even with food)
    if (dmgPerCycle > potentialHealPerCycle || unitHeal === 0) {
        const netDmgPerCycle = dmgPerCycle - potentialHealPerCycle;

        let totalCycles = 0;
        if (unitHeal > 0 && foodAmount > 0) {
            const maxHealsPerCycle = Math.floor(totalCycleMs / 5000) || (totalCycleMs > 0 ? 0.2 : 0);
            const cyclesUntilFoodOut = foodAmount / maxHealsPerCycle;
            const hpLostWithFood = netDmgPerCycle * cyclesUntilFoodOut;

            if (hpLostWithFood >= currentHp) {
                // Dies before food runs out
                totalCycles = currentHp / netDmgPerCycle;
            } else {
                // Food runs out, then dies with full damage
                const remainingHp = currentHp - hpLostWithFood;
                totalCycles = cyclesUntilFoodOut + (remainingHp / dmgPerCycle);
            }
        } else {
            // No food from the start
            totalCycles = currentHp / dmgPerCycle;
        }

        const totalSeconds = (totalCycles * totalCycleMs) / 1000;
        if (totalSeconds > idleLimitSeconds) {
            return { seconds: totalSeconds, text: "∞", color: "#4caf50" };
        }
        return formatSurvival(totalSeconds);
    }

    // SCENARIO C: Heal >= Damage (HP is stable or increasing until food runs out)
    if (unitHeal > 0 && foodAmount > 0) {
        // Treat Current HP and Total Food Heal as a single pool of "Effective HP"
        // This handles cases where user starts with low HP but has enough food to reach Max HP
        const foodNeededPerCycle = dmgPerCycle / unitHeal;
        const cyclesUntilFoodOut = foodAmount / foodNeededPerCycle;

        // After food is out, player starts losing HP from full (or current, if higher than max? no, clamped at server)
        // However, most accurate is: (CurrentHP + TotalFoodHeal) / dmgPerCycle
        const totalEffectiveHp = currentHp + (foodAmount * unitHeal);
        const totalCycles = totalEffectiveHp / dmgPerCycle;

        const totalSeconds = (totalCycles * totalCycleMs) / 1000;

        if (totalSeconds > idleLimitSeconds) {
            return { seconds: totalSeconds, text: "∞", color: "#4caf50" };
        }
        return formatSurvival(totalSeconds);
    }

    // Default Fallback
    const totalSeconds = (currentHp / dmgPerCycle) * totalCycleMs / 1000;
    return formatSurvival(totalSeconds > idleLimitSeconds ? Infinity : totalSeconds);
};

const formatSurvival = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    let text = "";
    let color = "#ff9800";

    if (hrs > 0) {
        text = `${hrs}h ${mins}m`;
        color = "#ff9800";
    } else if (mins > 0) {
        text = `${mins}m ${secs}s`;
        color = "#ff9800";
    } else {
        text = `${secs}s`;
        color = "#ff4444";
    }

    return { seconds: totalSeconds, text, color };
};
