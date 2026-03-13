import { CombatManager } from './managers/CombatManager.js';
import fs from 'fs';

const logFile = 'test_fractional_results.log';
fs.writeFileSync(logFile, "Starting Fractional Proficiency XP Test...\n");

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

async function testFractionalProficiencyXP() {
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
            log(`!!! XP Awarded: ${amount} to ${skill} !!!`);
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
                WARRIOR_PROFICIENCY: { level: 5, xp: 50, buffer: 0 }
            },
            combat: {
                mobId: 'RABBIT',
                tier: 1,
                mobName: 'Rabbit',
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

    log("Simulating 4 combat victories against RABBIT (5 XP each -> 0.25 Prof XP)...");
    
    for (let i = 1; i <= 4; i++) {
        log(`\n--- Kill #${i} ---`);
        try {
            await combatManager.processCombatRound(mockChar);
            const buffer = mockChar.state.skills.WARRIOR_PROFICIENCY.buffer;
            log(`Current Warrior Buffer: ${buffer}`);
        } catch (err) {
            log(`Error: ${err.message}`);
        }
    }
    
    log("\nTest finished.");
}

testFractionalProficiencyXP().catch(e => log(`Fatal: ${e.message}`));
