import { Buffer } from 'buffer';

const mockChar = {
    id: 'char-123',
    user_id: 'user-456',
    name: 'Bencher',
    state: {
        health: 80,
        maxHealth: 100,
        silver: 50000,
        inventory: {
            'T1_WOOD': 100,
            'T1_ORE': 50,
            'T2_METAL_BAR': 10,
            'T1_SWORD_1STAR': { quality: 2, stars: 1, amount: 1 },
            'HEALTH_POTION': 5,
            'COAL': 200,
            'RUNE_ATTACK_SPEED': 1,
            'RUNE_CRAFT_COPY': 1,
            'T1_RUNE_SHARD': 500
        },
        skills: {
            'COMBAT': { level: 50, xp: 150000, nextLevelXp: 5000 },
            'LUMBERJACK': { level: 20, xp: 10000 },
            'ORE_MINER': { level: 10, xp: 2000 },
            'WARRIOR_PROFICIENCY': { level: 45, xp: 120000 }
        },
        equipment: {
            mainHand: { id: 'T2_SWORD', stats: { damage: 20 } },
            chest: { id: 'T2_ARMOR', stats: { defense: 15 } },
            food: { id: 'APPLE', amount: 50 }
        },
        bank: { items: { 'GOLD_BAR': 1 }, slots: 10 },
        notifications: [{ type: 'LEVEL_UP', text: 'Congrats!', id: 1 }],
        combat: { mobId: 'wolf', mobHealth: 50, kills: 100 }
    },
    current_activity: { type: 'GATHERING', item_id: 'T1_WOOD', actions_remaining: 50 },
    activity_started_at: new Date().toISOString()
};

const mockStats = {
    damage: 25,
    defense: 20,
    maxHP: 150,
    attackSpeed: 800,
    globals: { xpYield: 10, dropRate: 5 }
};

// --- BEFORE ---
const beforeStatus = {
    character_id: mockChar.id,
    user_id: mockChar.user_id,
    name: mockChar.name,
    state: mockChar.state,
    guild: { id: 'guild-1', name: 'Devs' },
    calculatedStats: mockStats,
    guild_bonuses: { xp: 5 },
    current_activity: mockChar.current_activity,
    activity_started_at: mockChar.activity_started_at,
    dungeon_state: null,
    serverTime: Date.now()
};

const createRound = (i) => ({
    message: 'Hit!',
    details: {
        playerDmg: 10,
        playerHits: 1,
        mobDmg: 5,
        mobHits: 1,
        playerHitList: [{ dmg: 10, isBurst: false }],
        mobHitList: [5],
        silverGained: 2,
        xpGained: 10,
        lootGained: [],
        mobName: 'Wolf'
    }
});

const beforeCombat = {
    success: true,
    message: 'Fighting...',
    combatUpdate: {
        allRounds: Array.from({length: 10}, (_, i) => createRound(i)),
        details: { totalPlayerDmgThisTick: 100, totalMobDmgThisTick: 50 }
    },
    status: beforeStatus
};

// --- AFTER ---
const afterLightStatus = {
    _lightweight: true,
    character_id: mockChar.id,
    name: mockChar.name,
    state: {
        health: mockChar.state.health,
        maxHealth: mockChar.state.maxHealth,
        silver: mockChar.state.silver,
        combat: mockChar.state.combat,
        dungeon: mockChar.state.dungeon,
        notifications: mockChar.state.notifications,
        equipment: { food: mockChar.state.equipment.food }
    },
    current_activity: mockChar.current_activity,
    activity_started_at: mockChar.activity_started_at,
    serverTime: Date.now()
};

const optimizedRound = (i) => ({
    message: 'Hit!',
    details: {
        playerDmg: 10,
        playerHits: 1,
        mobDmg: 5,
        mobHits: 1,
        playerHitList: [{ dmg: 10, isBurst: false }],
        mobHitList: [5],
        silverGained: 2,
        xpGained: 10,
        mobName: 'Wolf',
        foodEaten: 0
    }
});

const afterCombat = {
    success: true,
    message: 'Fighting...',
    combatUpdate: {
        allRounds: Array.from({length: 3}, (_, i) => optimizedRound(i)),
        _roundsOmitted: 7,
        details: { 
            totalPlayerDmgThisTick: 100, 
            totalMobDmgThisTick: 50,
            totalSilverThisTick: 20,
            totalXpThisTick: 100
        }
    },
    status: afterLightStatus
};

// --- CALCULATIONS ---
const getBytes = (obj) => Buffer.byteLength(JSON.stringify(obj), 'utf8');

const s1_before = getBytes(beforeStatus);
const s1_after = getBytes(afterLightStatus);
const c1_before = getBytes(beforeCombat);
const c1_after = getBytes(afterCombat);

console.log('=== BANDWIDTH COMPARISON (Bytes per Message) ===');
console.log('');
console.log('1. Regular Status Update (Frequency: 1-5s)');
console.log(`   Before: ${s1_before.toLocaleString()} bytes`);
console.log(`   After:  ${s1_after.toLocaleString()} bytes`);
console.log(`   Reduction: ${((1 - s1_after/s1_before) * 100).toFixed(1)}%`);
console.log('');
console.log('2. Combat Result Update (Frequency: 1s)');
console.log(`   Before: ${c1_before.toLocaleString()} bytes`);
console.log(`   After:  ${c1_after.toLocaleString()} bytes`);
console.log(`   Reduction: ${((1 - c1_after/c1_before) * 100).toFixed(1)}%`);
console.log('');
console.log('3. Projected Impact');
console.log(`   Estimated Original Monthly Usage: 101.2 GB`);
console.log(`   Projected New Monthly Usage: ~${(101.2 * (s1_after/s1_before)).toFixed(2)} GB`);
console.log(`   Total Estimated Savings: ~${(101.2 * (1 - s1_after/s1_before)).toFixed(2)} GB / Month`);
console.log('================================================');
