
import { createClient } from '@supabase/supabase-js';
import { GameManager } from './GameManager.js';
import dotenv from 'dotenv';
dotenv.config();

const mockChar = {
    id: 'test-char-combat',
    user_id: 'test-user',
    name: 'EternoCombatMock',
    state: {
        inventory: {},
        skills: {
            COMBAT: { level: 1, xp: 0 }
        },
        stats: {
            attackSpeed: 1000,
            damage: 10,
            defense: 5,
            hp: 100,
            maxHP: 100
        },
        combat: {
            mobId: 'RABBIT',
            tier: 1,
            mobName: 'Rabbit',
            mobMaxHealth: undefined, // corrupted max
            mobHealth: undefined,    // corrupted current
            mobDamage: 2,
            mobDefense: 0,
            mobAtkSpeed: 2000,
            mob_next_attack_at: Date.now() + 1000,
            playerHealth: 100,
            auto: true,
            kills: 0,
            started_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
        },
        last_saved: new Date(Date.now() - 3600000).toISOString()
    }
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const gameManager = new GameManager(supabase);

// Mock DB interactions and internal managers
gameManager.getCharacter = async () => mockChar;
gameManager.persistCharacter = async () => console.log("[MOCK] Persist Character Called");
gameManager.markDirty = (id) => console.log(`[MOCK] Marked Dirty: ${id}`);
gameManager.saveState = async (id, state) => console.log(`[MOCK] Save State: Kills=${state.combat?.kills}`);
gameManager.addXP = (char, skill, amount) => {
    console.log(`[MOCK] Added ${amount} XP to ${skill}`);
    return false; // leveledUp
};
gameManager.processFood = (char) => ({ used: false, amount: 0 }); // Mock food

// Mock InventoryManager.calculateStats to return stable stats
gameManager.inventoryManager.calculateStats = (char) => {
    return {
        attackSpeed: 1000,
        damage: 10,
        defense: 5,
        maxHP: 100
    };
};

const originalProcess = gameManager.combatManager.processCombatRound.bind(gameManager.combatManager);
gameManager.combatManager.processCombatRound = async (char, time) => {
    const startHp = char.state.combat?.mobHealth;
    const result = await originalProcess(char, time);
    const endHp = char.state.combat?.mobHealth;
    // Log first few rounds
    if (Math.random() < 0.05) console.log(`[DEBUG] Round: StartHP=${startHp}, EndHP=${endHp}, Victory=${result.details?.victory}`);
    return result;
};

async function runTest() {
    console.log("--- Starting Combat Offline Test ---");

    // Simulate Catchup
    const now = Date.now();
    console.log("Mock Last Saved:", mockChar.last_saved);
    const lastSaved = new Date(mockChar.state.last_saved || mockChar.last_saved).getTime();
    console.log("Parsed Last Saved:", lastSaved);
    console.log("Now:", now);

    // Fallback if last_saved missing in root but present in state (GameManager structure varies)

    const elapsedSeconds = (now - lastSaved) / 1000;

    console.log(`Elapsed Seconds: ${elapsedSeconds}`);

    const stats = gameManager.inventoryManager.calculateStats(mockChar);
    const atkSpeed = Number(stats.attackSpeed) || 1000;
    const secondsPerRound = atkSpeed / 1000;

    const maxRounds = Math.floor(elapsedSeconds / secondsPerRound);
    console.log(`Max Rounds: ${maxRounds}`);

    if (maxRounds > 0) {
        const report = await gameManager.processBatchCombat(mockChar, maxRounds);
        import('fs').then(fs => {
            fs.writeFileSync('report.json', JSON.stringify(report, null, 2));
            console.log("Report saved to report.json");
        });

        console.log("Combat Report:", JSON.stringify(report, null, 2));

        if (report.kills > 0) {
            console.error(`SUCCESS: Generated ${report.kills} kills.`);
        } else {
            console.error("FAILURE: Generated 0 kills despite time passing.");
        }
    }
}

runTest();
