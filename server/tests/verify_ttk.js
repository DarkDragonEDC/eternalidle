
import { CombatManager } from '../managers/CombatManager.js';
import { calculateTTK } from '../../shared/combat_logic.js';
import { MONSTERS } from '../../shared/monsters.js';

// Mock GameManager
const mockGm = {
    getCharacter: async () => ({ id: 'test', name: 'Tester', state: { health: 999999, skills: { COMBAT: { level: 100 } } } }),
    saveState: async () => true,
    addXP: () => false,
    processFood: () => ({ used: false }),
    inventoryManager: {
        calculateStats: (char) => char._stats || { damage: 10, attackSpeed: 1000, defense: 0 },
        addItemToInventory: () => true
    },
    pushManager: { notifyUser: () => {} },
    addActionSummaryNotification: () => {}
};

async function runVerification() {
    const cm = new CombatManager(mockGm);
    
    const testScenarios = [
        { name: "Early Game (Rabbit)", stats: { damage: 50, attackSpeed: 1000, burstChance: 0, defense: 0 }, mobTier: 1, mobId: 'RABBIT' }, // HP 2500
        { name: "Mid Game (Ogre) w/ Burst", stats: { damage: 500, attackSpeed: 600, burstChance: 25, burstDmg: 2.0, defense: 0 }, mobTier: 5, mobId: 'OGRE' }, // HP 20877
        { name: "High Speed (Ancient Golem)", stats: { damage: 1000, attackSpeed: 200, burstChance: 40, burstDmg: 1.5, defense: 0 }, mobTier: 8, mobId: 'ANCIENT_GOLEM' }, // HP 57431
        { name: "Mitigation Test (Rune Guardian)", stats: { damage: 1500, attackSpeed: 500, burstChance: 10, burstDmg: 1.5, defense: 0 }, mobTier: 7, mobId: 'RUNE_GUARDIAN' }
    ];

    console.log("=== TTK Verification Report ===\n");
    console.log("Loading MONSTERS...");
    const tiers = Object.keys(MONSTERS);
    console.log(`Available Tiers: ${tiers.join(', ')}`);

    console.log(`${"Scenario".padEnd(30)} | ${"Theoretical".padEnd(12)} | ${"Empirical (Avg)".padEnd(15)} | ${"Diff %"}`);
    console.log("-".repeat(80));

    // Mock Date.now to control time exactly in simulation
    let virtualNow = 1000000;
    const realDateNow = Date.now;
    Date.now = () => virtualNow;

    for (const scenario of testScenarios) {
        console.log(`\nRunning Scenario: ${scenario.name}...`);
        try {
            const tierData = MONSTERS[scenario.mobTier.toString()];
            const mobData = tierData.find(m => m.id === scenario.mobId);
            const theoretical = calculateTTK(scenario.stats, mobData);
            
            const N = 50;
            let totalTimeUsed = 0;

            for (let i = 0; i < N; i++) {
                const char = { 
                    id: 'test', 
                    state: { health: 1000000, skills: { COMBAT: { level: 100 } }, inventory: {} },
                    _stats: scenario.stats 
                };
                
                // Reset virtual time for each kill
                virtualNow = 1000000;
                const startTime = virtualNow;
                
                // Manually init combat state to bypass Date.now() issues entirely
                char.state.combat = {
                    mobId: scenario.mobId,
                    tier: scenario.mobTier,
                    mobName: mobData.name,
                    mobMaxHealth: mobData.health,
                    mobHealth: mobData.health,
                    mobDamage: mobData.damage || 5,
                    mobDefense: mobData.defense || 0,
                    mob_next_attack_at: virtualNow + 1000, // Standardize
                    player_next_attack_at: virtualNow + (scenario.stats.attackSpeed || 1000),
                    next_attack_at: virtualNow,
                    mobAtkSpeed: 1000,
                    playerHealth: char.state.health,
                    auto: true
                };
                
                let rounds = 0;
                const MAX_ROUNDS = 100000;
                while (char.state.combat && char.state.combat.mobHealth > 0 && rounds < MAX_ROUNDS) {
                    const nowAtStart = virtualNow;
                    await cm.processCombatRound(char, virtualNow);
                    
                    const combat = char.state.combat;
                    const nextPlayer = combat.player_next_attack_at;
                    const nextMob = combat.mob_next_attack_at;
                    
                    if (rounds < 10 && i === 0) {
                        console.log(`    [ROUND ${rounds}] now=${nowAtStart}, hp=${combat.mobHealth.toFixed(1)}, nextP=${nextPlayer}, nextM=${nextMob}`);
                    }

                    if (isNaN(nextPlayer) || isNaN(nextMob)) {
                        console.log(`    [ERROR] NaN detected! nextPlayer=${nextPlayer}, nextMob=${nextMob}`);
                        break;
                    }

                    const nextEvent = Math.min(nextPlayer, nextMob);
                    virtualNow = Math.max(virtualNow + 1, nextEvent);
                    rounds++;
                }
                
                if (rounds >= MAX_ROUNDS) {
                    console.log(`  [WARN] Kill timed out after ${MAX_ROUNDS} rounds! Final HP: ${char.state.combat.mobHealth}`);
                }

                const killDuration = (virtualNow - startTime) / 1000;
                totalTimeUsed += killDuration;
            }

            const empiricalAvg = totalTimeUsed / N;
            const diffPercent = ((empiricalAvg - theoretical.cycleTimeSeconds) / theoretical.cycleTimeSeconds) * 100;

            console.log(`RESULT_LINE|${scenario.name.padEnd(30)}|T:${theoretical.cycleTimeSeconds.toFixed(3)}s|E:${empiricalAvg.toFixed(3)}s|D:${diffPercent.toFixed(2)}%`);
        } catch (err) {
            console.error(`ERROR_IN_SCENARIO|${scenario.name}|`, err);
        }
    }
    
    // Restore real Date.now
    Date.now = realDateNow;
    console.log("\n=== VERIFICATION_COMPLETE ===");
}

runVerification().catch(console.error);
