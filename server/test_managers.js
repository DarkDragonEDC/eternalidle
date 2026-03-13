const managers = [
    './managers/InventoryManager.js',
    './managers/ActivityManager.js',
    './managers/CombatManager.js',
    './managers/MarketManager.js',
    './managers/DungeonManager.js',
    './managers/OrbsManager.js',
    './managers/AdminManager.js',
    './managers/DailyRewardManager.js',
    './managers/TradeManager.js',
    './managers/WorldBossManager.js',
    './managers/SocialManager.js',
    './managers/GuildManager.js',
    './managers/PushManager.js',
    './managers/MigrationManager.js',
    './managers/UserManager.js',
    './managers/StatsManager.js',
    './managers/CatchupManager.js'
];

async function test() {
    for (const m of managers) {
        try {
            await import(m);
            console.log(`${m} OK`);
        } catch (e) {
            console.error(`${m} FAILED:`);
            console.error(e);
            process.exit(1);
        }
    }
    console.log('All managers OK');
}

test();
