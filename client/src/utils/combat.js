import { calculateTTK } from '@shared/combat_logic';

export const calculateSurvivalTime = (playerStats, mobData, foodItem, foodAmountInput, currentHp, isPremium = false, profLevel = 1) => {
    if (!mobData) return { seconds: Infinity, text: "∞", color: "#4caf50" };

    const foodAmount = typeof foodAmountInput === 'object' ? (foodAmountInput.amount || 0) : (Number(foodAmountInput) || 0);

    const maxHp = playerStats.maxHP || playerStats.hp || 100;
    const defense = playerStats.defense || 0;

    const mobBaseDmg = mobData.damage || 1;
    const mobAtkSpeed = 1000; // Server constant

    // Mitigation (Defense)
    const playerMitigation = Math.min(0.75, defense / 10000);

    // Damage per hit to player (only defense mitigation, farm cap removed)
    const dmgToPlayer = Math.max(1, Math.floor(mobBaseDmg * (1 - playerMitigation)));

    // Healing
    let unitHeal = 0;
    if (foodItem) {
        if (foodItem.healPercent) {
            unitHeal = Math.floor(maxHp * (foodItem.healPercent / 100));
        } else {
            unitHeal = foodItem.heal || 0;
        }
    }
    if (unitHeal < 1) unitHeal = 0;

    const mobMaxHp = mobData.health || 100;

    // Average Hit including Burst
    const ttk = calculateTTK(playerStats, mobData);
    
    // Time to Kill (TTK) in ms
    let timeToKill = ttk.cycleTimeSeconds * 1000;
    
    // Safety check: if TTK is Infinity (e.g. 0 damage), survival is bounded by food/hp
    if (isNaN(timeToKill) || timeToKill === Infinity) {
        timeToKill = Infinity; 
    }

    // Mob Attacks during TTK
    // Mob now attacks at t=0. Subsequent attacks every 1000ms.
    const mobAttacksPerKill = 1 + Math.floor(timeToKill / 1000);
    const totalDmgPerKill = mobAttacksPerKill * dmgToPlayer;
    const totalCycleTime = timeToKill + 1000; // TTK + 1s Respawn

    // Rates
    const dmgRate = totalDmgPerKill / (totalCycleTime / 1000);
    const healPerSec = unitHeal / 5; // 5s food cooldown

    const idleLimitSeconds = (isPremium ? 12 : 8) * 3600;
    const limitText = isPremium ? "12h+" : "8h+";

    // SCENARIO A: No damage (Unlimited survival)
    if (dmgRate <= 0) return { seconds: Infinity, text: limitText, color: "#4caf50" };

    let totalSeconds = 0;

    // The "Golden Formula":
    // 1. If we die even while eating as fast as possible (dmg > healPerSec)
    // 2. Otherwise, we only die when our total HP pool (HP + Food) is exhausted by the damage rate.

    const netDmgRate = dmgRate - healPerSec;
    let color = "#ffcc00"; // Default: Yellow (Food running out)

    if (netDmgRate > 0) {
        const timeToDieWhileHealing = currentHp / netDmgRate;
        const maxHealingTime = foodAmount * 5;

        if (timeToDieWhileHealing < maxHealingTime) {
            // Bottlenecked by 5s cooldown - we die with food left in the bag
            totalSeconds = timeToDieWhileHealing;
            color = "#ff4444"; // Red: Damage > Healing speed
        } else {
            // Food runs out first, then we die at full dmgRate
            totalSeconds = (currentHp + foodAmount * unitHeal) / dmgRate;
            color = "#ffcc00"; // Yellow: Food depletion
        }
    } else {
        // Healing >= Damage. We never die while we have food.
        totalSeconds = (currentHp + foodAmount * unitHeal) / dmgRate;
        color = "#ffcc00"; // Yellow: Food depletion
    }

    if (totalSeconds >= idleLimitSeconds) {
        return { seconds: totalSeconds, text: limitText, color: "#4caf50" };
    }

    return formatSurvival(totalSeconds, color);
};

const formatSurvival = (totalSeconds, overrideColor = null) => {
    const days = Math.floor(totalSeconds / 86400);
    const hrs = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    let text = "";
    let color = overrideColor || "#ff9800";

    if (days > 0) {
        text = `${days}d ${hrs}h`;
    } else if (hrs > 0) {
        text = `${hrs}h ${mins}m`;
    } else if (mins > 0) {
        text = `${mins}m ${secs}s`;
    } else {
        text = `${secs}s`;
        if (!overrideColor) color = "#ff4444";
    }

    return { seconds: totalSeconds, text, color };
};
