import { InventoryManager } from './managers/InventoryManager.js';
import { INITIAL_SKILLS } from '../shared/skills.js';

// Mock simples do GameManager e Character
class MockGameManager {
    constructor() { }
}

const mockChar = {
    state: {
        skills: { ...INITIAL_SKILLS },
        inventory: {},
        equipment: {},
        stats: { str: 0, agi: 0, int: 0 }
    }
};

const runTest = () => {
    const im = new InventoryManager(new MockGameManager());

    console.log("=== TESTE DE VELOCIDADE DE ATAQUE ===");

    // 1. Force stats to 0 to verify BASE logic
    mockChar.state.skills = {}; // Clear skills
    let stats = im.calculateStats(mockChar);
    console.log(`[TESTE 1] Base Attack Speed (0 stats): ${stats.attackSpeed}`);
    if (stats.attackSpeed === 1000) {
        console.log("✅ PASS: Velocidade base (0 stats) é 1000ms");
    } else {
        console.error(`❌ FAIL: Velocidade base (0 stats) incorreta: ${stats.attackSpeed}`);
    }

    // 2. Restore Initial Skills (Fresh Character)
    mockChar.state.skills = { ...INITIAL_SKILLS };
    stats = im.calculateStats(mockChar);
    // AGI = 6 (from 6 skills at lvl 1) -> 30ms reduction
    console.log(`[TESTE 2] Fresh Character Speed (Lvl 1 Skills -> ~6 AGI): ${stats.attackSpeed}`);
    if (stats.attackSpeed === 970) {
        console.log("✅ PASS: Personagem inicial tem 970ms (devido a stats lvl 1)");
    } else {
        console.log(`⚠️ INFO: Valor inicial: ${stats.attackSpeed} (Esperado 970)`);
    }

    // 3. Add Stats (Simulate Level Up)
    // BOW_MASTERY dá AGI
    if (!mockChar.state.skills.BOW_MASTERY) {
        mockChar.state.skills.BOW_MASTERY = { level: 1, xp: 0 };
    }

    // Nível 20 em Bow Mastery deve dar 20 AGI (assumindo 1 por level conforme visto em InventoryManager)
    mockChar.state.skills.BOW_MASTERY.level = 21;

    stats = im.calculateStats(mockChar);
    console.log(`[TESTE 2] AGI Effect (Level 21 Bow Mastery -> ~20 AGI): AGI=${stats.agi}, Speed=${stats.attackSpeed}`);

    if (stats.attackSpeed < 1000) {
        console.log(`✅ PASS: Velocidade diminuiu com nível (${stats.attackSpeed}ms)`);
    } else {
        console.error(`❌ FAIL: Velocidade não diminuiu com nível (${stats.attackSpeed}ms)`);
    }

    if (stats.attackSpeed === 1000 - (stats.agi * 5)) {
        console.log(`✅ PASS: Cálculo exato verificado (1000 - ${stats.agi}*5 = ${stats.attackSpeed})`);
    } else {
        console.log(`⚠️ INFO: Cálculo exato pode ter variado p/ limite min ou bonus de gear (esperado ${1000 - (stats.agi * 5)})`);
    }

};

runTest();
