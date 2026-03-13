import { CombatManager } from './managers/CombatManager.js';
import fs from 'fs';

const logFile = 'test_results.log';
fs.writeFileSync(logFile, "Starting Proficiency XP Test...\n");

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

async function testProficiencyXP() {
    const mockGameManager = {
        supabase: {
            from: () => ({
                insert: async () => ({ error: null })
            })
        },
        inventoryManager: {
            calculateStats: (char) => {
                return {
                    activeProf: 'warrior',
                    globals: { xpYield: 0 }
                };
            },
            addItemToInventory: () => true
        },
        addXP: (char, skill, amount) => {
            log(`XP Awarded: ${amount} to ${skill}`);
            return null;
        },
        addActionSummaryNotification: () => {}
    };

    const combatManager = new CombatManager(mockGameManager);

    const mockChar = {
        id: 'test-char-id',
        name: 'TestHero',
        state: {
            skills: {
                COMBAT: { level: 10, xp: 100 },
                WARRIOR_PROFICIENCY: { level: 5, xp: 50 }
            },
            combat: {
                mobId: 'DIRE_WOLF',
                tier: 4,
                mobName: 'Dire Wolf',
                playerHealth: 100,
                mobHealth: 0,
                totalPlayerDmg: 500,
                totalMobDmg: 50,
                sessionLoot: {},
                sessionXp: 0,
                sessionSilver: 0,
                kills: 0,
                started_at: Date.now()
            }
        }
    };

    log("Simulating combat round victory against DIRE_WOLF (Tier 4)...");


    try {
        await combatManager.processCombatRound(mockChar);
        log("ProcessCombatRound finished successfully.");
    } catch (err) {
        log(`Error: ${err.message}`);
    }
    
    log("Test finished.");
}

testProficiencyXP().catch(e => log(`Fatal: ${e.message}`));

