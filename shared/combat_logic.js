/**
 * Unified Combat Logic and Formulas
 * Shared between Server (for testing/prediction) and Client (for UI)
 */

import { MAX_MITIGATION, MITIGATION_PER_DEFENSE, DEFAULT_PLAYER_ATTACK_SPEED } from './combat.js';

/**
 * Calculates the theoretical Time to Kill (TTK) a monster.
 * @param {Object} playerStats - Current player stats (damage, attackSpeed, burstChance, burstDmg, etc.)
 * @param {Object} mobData - Monster data (health, defense)
 * @returns {Object} - Result containing roundsToKill, avgDamagePerHit, and totalTtkSeconds
 */
export const calculateTTK = (playerStats, mobData) => {
    if (!mobData) return { roundsToKill: 0, avgDamagePerHit: 0, totalTtkSeconds: 0 };

    const playerDmg = playerStats.damage || 1;
    const playerAtkSpeed = Math.max(200, playerStats.attackSpeed || DEFAULT_PLAYER_ATTACK_SPEED);
    
    const mobMaxHp = mobData.health || 100;
    const mobDef = mobData.defense || 0;
    const mobMitigation = Math.min(MAX_MITIGATION, mobDef * MITIGATION_PER_DEFENSE);

    // Burst Logic (Server uses Math.floor(mitigatedHit * burstMult))
    const burstChance = playerStats.burstChance || 0;
    const burstMult = playerStats.burstDmg || 1.5;

    const baseMitigatedHit = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));
    const burstHit = Math.floor(baseMitigatedHit * burstMult);
    
    // Weighted Average Hit
    const avgDamagePerHit = (baseMitigatedHit * (1 - (burstChance / 100))) + (burstHit * (burstChance / 100));

    // Time to Kill (TTK)
    // Formula: Rounds = HP / AvgHit
    const roundsToKill = Math.ceil(mobMaxHp / avgDamagePerHit);
    
    // In game, first hit happens at Math.max(RESPAWN_DELAY_MS, playerAtkSpeed) after the previous kill.
    // Subsequent hits for the same monster happen every playerAtkSpeed.
    // CycleTime = WaitTimeForFirstHit + (TotalHits - 1) * AttackSpeed
    const activeCombatTime = (roundsToKill - 1) * playerAtkSpeed; // Time from first hit to last hit
    const RESPAWN_DELAY_MS = 1000;
    const cycleTimeMs = Math.max(RESPAWN_DELAY_MS, playerAtkSpeed) + (roundsToKill - 1) * playerAtkSpeed;
    const cycleTimeSeconds = cycleTimeMs / 1000;

    return {
        baseMitigatedHit,
        burstHit,
        avgDamagePerHit,
        roundsToKill,
        activeCombatTimeSeconds: activeCombatTime / 1000,
        cycleTimeSeconds
    };
};
