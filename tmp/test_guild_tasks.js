
// Simulação simplificada da lógica de geração de tarefas para teste
const GUILD_TASKS_CONFIG = {
    MAX_TASKS: 13,
    POOLS: {
        RAW: ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'],
        REFINED: ['PLANK', 'BAR', 'LEATHER', 'CLOTH', 'EXTRACT'],
        POTION: ['GATHER', 'REFINE', 'CRAFT', 'SILVER', 'QUALITY', 'LUCK', 'XP', 'CRIT', 'DAMAGE'],
        FOOD: ['FOOD']
    },
    REQUIREMENTS: { RAW: {}, REFINED: {}, FOOD: {}, POTION: {} }
};

function generateNewTasks(libraryLevel = 1) {
    const config = GUILD_TASKS_CONFIG;
    const tasks = [];
    const tier = Math.min(10, Math.max(1, libraryLevel));

    const potionSuffixMap = {
        'GATHER': '_POTION_GATHER',
        'REFINE': '_POTION_REFINE',
        'CRAFT': '_POTION_CRAFT',
        'SILVER': '_POTION_SILVER',
        'QUALITY': '_POTION_QUALITY',
        'LUCK': '_POTION_LUCK',
        'XP': '_POTION_XP',
        'CRIT': '_POTION_CRIT',
        'DAMAGE': '_POTION_DAMAGE'
    };

    let taskId = 0;

    // 1. RAW: Fixed (one of each item in the pool)
    config.POOLS.RAW.forEach(mat => {
        tasks.push({
            id: taskId++,
            type: 'RAW',
            itemId: `T${tier}_${mat}`,
            required: config.REQUIREMENTS.RAW?.[tier] || 100,
            progress: 0,
            contributors: {}
        });
    });

    // 2. REFINED: Fixed (one of each item in the pool)
    config.POOLS.REFINED.forEach(mat => {
        tasks.push({
            id: taskId++,
            type: 'REFINED',
            itemId: `T${tier}_${mat}`,
            required: config.REQUIREMENTS.REFINED?.[tier] || 100,
            progress: 0,
            contributors: {}
        });
    });

    // 3. FOOD: Fixed
    tasks.push({
        id: taskId++,
        type: 'FOOD',
        itemId: `T${tier}_FOOD`,
        required: config.REQUIREMENTS.FOOD?.[tier] || 100,
        progress: 0,
        contributors: {}
    });

    // 4. POTION: Random choice from pool
    const potionPool = config.POOLS.POTION;
    const mat = potionPool[Math.floor(Math.random() * potionPool.length)];
    const suffix = potionSuffixMap[mat] || `_POTION_${mat}`;
    
    tasks.push({
        id: taskId++,
        type: 'POTION',
        itemId: `T${tier}${suffix}`,
        required: config.REQUIREMENTS.POTION?.[tier] || 11,
        progress: 0,
        contributors: {}
    });

    return tasks;
}

const tasks = generateNewTasks(5);
console.log("Tasks geradas (Tier 5):");
tasks.forEach(t => console.log(`Slot ${t.id}: ${t.type} -> ${t.itemId}`));

if (tasks.length === 13) {
    console.log("\n✅ Total de 13 tarefas geradas.");
} else {
    console.log(`\n❌ Erro: Gerou ${tasks.length} tarefas.`);
}

const itemIds = tasks.map(t => t.itemId);
const uniqueItems = new Set(itemIds);
if (uniqueItems.size === 13) {
    console.log("✅ Todos os 13 itens são únicos.");
} else {
    console.log(`\n❌ Erro: Existem itens repetidos! (Apenas ${uniqueItems.size} únicos)`);
}
