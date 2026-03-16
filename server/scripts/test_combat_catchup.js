import { CombatManager } from '../managers/CombatManager.js';
import { CatchupManager } from '../managers/CatchupManager.js';

class MockGameManager {
    constructor() {
        this.inventoryManager = {
            calculateStats: (char) => ({
                attackSpeed: 2000,
                damage: 1500, // Guessing based on level 66 player who can fight a troll
                defense: 100
            })
        };
        this.combatManager = new CombatManager(this);
        this.catchupManager = new CatchupManager(this);
    }
    
    getMaxIdleTime() { return 12 * 60 * 60 * 1000; } // 12 hours
    processFood() { return { used: false }; }
    addXP() { return false; }
}

async function run() {
    const gm = new MockGameManager();
    const char = {
        name: "MockUser",
        state: {
            health: 2500,
            skills: {
                COMBAT: { level: 66, xp: 1000000 }
            },
            equipment: {}
        },
        last_saved: new Date(Date.now() - 79 * 60 * 1000).toISOString() // 1h 19m ago
    };
    
    // Start combat
    await gm.combatManager.startCombat('user', 'char', 'TROLL', 6, char);
    
    // Run catchup
    console.log("Starting catchup...");
    const report = await gm.catchupManager.processBatchCombat(char, (79 * 60) / 2); // 2 seconds per attack -> 2370 rounds
    
    console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
