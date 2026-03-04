import { GameManager } from './GameManager.js';
import { MONSTERS } from '../shared/monsters.js';
import dotenv from 'dotenv';
dotenv.config();

// Mock Supabase
const mockSupabase = {
    from: () => ({
        insert: async () => ({ error: null }),
        select: () => ({
            eq: () => ({
                single: async () => ({ data: { id: 'test-char', name: 'Test Character', state: { skills: { COMBAT: { level: 100 }, WARRIOR_PROFICIENCY: { level: 1 } }, inventory: {}, equipment: { mainHand: { id: 'T10_SWORD' } }, health: 200000 }, user_id: 'test-user' } })
            })
        })
    })
};

const gameManager = new GameManager(mockSupabase);

async function runTest() {
    console.log("Starting ETERNAL_WATCHER test...");
    const char = {
        id: 'test-char',
        user_id: 'test-user',
        name: 'Test Character',
        state: {
            skills: {
                COMBAT: { level: 100 },
                WARRIOR_PROFICIENCY: { level: 1 }
            },
            inventory: {},
            equipment: {
                mainHand: { id: 'T10_SWORD' }
            },
            health: 200000,
            combat: {
                mobId: 'ETERNAL_WATCHER',
                tier: 10,
                mobName: 'Eternal Watcher',
                mobMaxHealth: 5000000,
                mobHealth: 1, // Set to 1 to trigger victory logic
                mobDamage: 130000,
                mobDefense: 40000,
                playerHealth: 200000,
                started_at: new Date().toISOString()
            }
        },
        calculatedStats: {
            damage: 5000,
            defense: 2500,
            attackSpeed: 1000
        }
    };

    try {
        console.log("Processing victory round...");
        const result = await gameManager.combatManager.processCombatRound(char);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("CRASH DETECTED:", err);
    }
}

runTest();
