/**
 * Shared survival time calculation logic for Eternal Idle.
 * Accounts for:
 * - Player and Mob Mitigation (0.75 cap)
 * - Food Healing and Cooldown (5s)
 * - Mob Respawn (1s delay)
 * - Idle Limit (8h normal / 12h premium)
 */

export const calculateSurvivalTime = (playerStats, mobData, foodItem, foodAmountInput, currentHp, isPremium = false) => {
    if (!mobData) return { seconds: Infinity, text: "∞", color: "#4caf50" };

    const foodAmount = typeof foodAmountInput === 'object' ? (foodAmountInput.amount || 0) : (Number(foodAmountInput) || 0);

    const maxHp = playerStats.maxHP || playerStats.hp || 100;
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

    // Precise Rates
    // Server logic: Mob hit timer is persistent across kills and respawns.
    // This means the player takes exactly 1 hit per mobAtkSpeed (1000ms) on average.
    const dmgRate = dmgToPlayer / (mobAtkSpeed / 1000); // Usually dmgToPlayer / 1
    const healRate = (unitHeal / 5000) * 1000; // unitHeal every 5s

    const idleLimitSeconds = (isPremium ? 12 : 8) * 3600;

    // SCENARIO A: No damage (Infinite survival)
    if (dmgRate <= 0) return { seconds: Infinity, text: "∞", color: "#4caf50" };

    // SCENARIO B: Losing HP (Heal < Damage)
    if (healRate < dmgRate || unitHeal === 0) {
        const netDmgRate = dmgRate - healRate;
        const foodDuration = foodAmount * 5; // Total time food lasts
        const hpLostWithFood = netDmgRate * foodDuration;

        let totalSeconds = 0;
        if (hpLostWithFood >= currentHp) {
            // Player loses HP even while eating food on cooldown
            totalSeconds = currentHp / netDmgRate;
        } else {
            // Survives until food runs out, then loses HP at full dmgRate
            const remainingHp = currentHp - hpLostWithFood;
            totalSeconds = foodDuration + (remainingHp / dmgRate);
        }

        if (totalSeconds > idleLimitSeconds) return { seconds: totalSeconds, text: "∞", color: "#4caf50" };
        return formatSurvival(totalSeconds);
    }

    // SCENARIO C: Stable/Gaining HP (Heal >= Damage)
    if (unitHeal > 0 && foodAmount > 0) {
        const foodDuration = foodAmount * 5;
        // HP when food runs out, capped at maxHP
        // (Note: Uses healRate-dmgRate for net gain during food duration)
        const hpAtEnd = Math.min(maxHp, currentHp + (healRate - dmgRate) * foodDuration);
        const totalSeconds = foodDuration + (hpAtEnd / dmgRate);

        if (totalSeconds > idleLimitSeconds) return { seconds: totalSeconds, text: "∞", color: "#4caf50" };
        return formatSurvival(totalSeconds);
    }

    // Default Fallback
    const totalSeconds = currentHp / dmgRate;
    if (totalSeconds > idleLimitSeconds) return { seconds: totalSeconds, text: "∞", color: "#4caf50" };
    return formatSurvival(totalSeconds);
};

const formatSurvival = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    let text = "";
    let color = "#ff9800";

    if (hrs > 0) {
        text = `${hrs}h ${mins}m**`;
        color = "#ff9800";
    } else if (mins > 0) {
        text = `${mins}m ${secs}s**`;
        color = "#ff9800";
    } else {
        text = `${secs}s**`;
        color = "#ff4444";
    }

    return { seconds: totalSeconds, text, color };
};
