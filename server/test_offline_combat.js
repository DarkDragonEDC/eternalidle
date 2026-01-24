
import { GameManager } from './GameManager.js';
import { MONSTERS } from '../shared/monsters.js';
import { INITIAL_SKILLS } from '../shared/skills.js';

// Mock Supabase
const mockSupabase = {
    from: () => ({
        select: () => ({
            eq: () => ({
                single: () => ({ data: null, error: null })
            })
        }),
        update: () => ({
            eq: () => ({ error: null })
        }),
        insert: () => ({ error: null })
    })
};

class MockGameManager extends GameManager {
    constructor() {
        super(mockSupabase);
        this.characters = {}; // Mock DB in memory
    }

    async getCharacter(userId, catchup = false) {
        if (this.characters[userId]) {
            const data = JSON.parse(JSON.stringify(this.characters[userId]));
            // Apply catchup logic manually here or just use the base method if it doesn't call supabase
            // Actually, getCharacter in base class calls this.supabase, so we need to mock it better or override.

            // Let's just implement the catchup logic here for verification
            if (catchup && (data.current_activity || data.state.combat) && data.last_saved) {
                const now = new Date();
                const lastSaved = new Date(data.last_saved).getTime();
                const elapsedSeconds = (now.getTime() - lastSaved) / 1000;

                if (data.state.combat) {
                    const stats = this.inventoryManager.calculateStats(data);
                    const atkSpeed = Number(stats.attackSpeed) || 1000;
                    const secondsPerRound = atkSpeed / 1000;

                    if (elapsedSeconds >= secondsPerRound) {
                        const roundsToProcess = Math.floor(elapsedSeconds / secondsPerRound);
                        const maxRounds = Math.min(roundsToProcess, 43200);

                        if (maxRounds > 0) {
                            const combatReport = await this.processBatchCombat(data, maxRounds);
                            if (combatReport.totalTime > 30) {
                                data.offlineReport = {
                                    ...data.offlineReport,
                                    combat: combatReport,
                                    totalTime: (data.offlineReport?.totalTime || 0) + combatReport.totalTime
                                };
                            }
                        }
                    }
                }
                data.last_saved = now.toISOString();
            }
            return data;
        }
        return null;
    }

    async saveState(userId, state) {
        if (this.characters[userId]) {
            this.characters[userId].state = JSON.parse(JSON.stringify(state));
        }
    }
}

const runTests = async () => {
    const gm = new MockGameManager();
    console.log("=== INICIANDO TESTES DE COMBATE OFFLINE ===");

    const charId = 'offline_fighter';
    let mobData = MONSTERS[1].find(m => m.id === 'T1_RAT');
    if (!mobData) mobData = { id: 'TEST_MOB', name: 'Test Mob', health: 20, damage: 2, xp: 10, silver: [5, 10], loot: {} };

    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();

    const initialChar = {
        id: charId,
        user_id: charId,
        name: 'Offline Explorer',
        last_saved: oneHourAgo,
        state: {
            health: 100,
            maxHealth: 100,
            stats: { str: 5, vit: 0 },
            inventory: { 'T1_BREAD': 10 },
            equipment: {
                food: { id: 'T1_BREAD', name: 'Bread', heal: 20, amount: 5 }
            },
            skills: JSON.parse(JSON.stringify(INITIAL_SKILLS)),
            combat: {
                mobId: mobData.id,
                mobName: mobData.name,
                mobHealth: mobData.health,
                mobMaxHealth: mobData.health,
                mobDamage: mobData.damage,
                mobDefense: mobData.defense || 0,
                tier: 1,
                playerHealth: 50, // Start with low HP to test food consumption
                started_at: oneHourAgo,
                sessionLoot: {},
                sessionXp: 0,
                sessionSilver: 0,
                kills: 0,
                totalPlayerDmg: 0,
                totalMobDmg: 0
            }
        }
    };

    gm.characters[charId] = initialChar;

    console.log(`[SETUP] Jogador offline por 1 hora.`);
    console.log(`[SETUP] HP Inicial: ${initialChar.state.combat.playerHealth}`);
    console.log(`[SETUP] Comida: ${initialChar.state.equipment.food.amount}x ${initialChar.state.equipment.food.name}`);

    const caughtUpChar = await gm.getCharacter(charId, true);

    console.log("\n--- Resultados do Catchup ---");
    if (caughtUpChar.offlineReport && caughtUpChar.offlineReport.combat) {
        const report = caughtUpChar.offlineReport.combat;
        console.log(`✅ [PASS] Relatório offline gerado.`);
        console.log(`- Rounds Processados: ${report.processedRounds}`);
        console.log(`- Kills: ${report.kills}`);
        console.log(`- XP Ganho: ${report.xpGained}`);
        console.log(`- Silver Ganho: ${report.silverGained}`);
        console.log(`- Comida Consumida: ${report.foodConsumed} HP`);

        if (report.kills > 0) {
            console.log(`✅ [PASS] Kills registradas no offline.`);
        } else {
            console.error(`❌ [FAIL] Nenhuma kill registrada.`);
        }

        if (report.foodConsumed > 0) {
            console.log(`✅ [PASS] Comida consumida corretamente.`);
        } else {
            console.warn(`⚠️ [WARN] Nenhuma comida consumida (pode não ter sido necessário).`);
        }
    } else {
        console.error(`❌ [FAIL] Relatório offline NÃO gerado.`);
    }

    console.log("\n=== FIM DOS TESTES ===");
};

runTests();
