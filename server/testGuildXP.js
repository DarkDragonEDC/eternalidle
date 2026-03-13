import { GuildManager } from './managers/GuildManager.js';
import fs from 'fs';

const logFile = 'test_guild_results.log';
fs.writeFileSync(logFile, "Starting Simple Guild XP Test...\n");

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

async function testGuildXP() {
    const mockGameManager = {
        supabase: {
            from: () => ({
                insert: async () => ({ error: null }),
                select: () => ({ maybeSingle: async () => ({ data: null }) })
            })
        }
    };

    const guildManager = new GuildManager(mockGameManager);
    
    // Simulating what GameManager.addXP does
    function simulateAddXP(char, amount) {
        log(`Simulating gain of ${amount} XP`);
        if (char.state.guild_id && amount > 0) {
            const guildXpGained = amount * 0.10; // 10% as per current code
            log(`  Guild XP Calculated: ${guildXpGained}`);
            guildManager.addPendingGuildXP(char.state.guild_id, guildXpGained, char.id);
        }
    }

    const mockChar = {
        id: 'char-123',
        state: {
            guild_id: 'guild-456'
        }
    };

    log("Initial State: " + JSON.stringify(guildManager.pendingGuildXP));

    simulateAddXP(mockChar, 100);
    log("State after 100 XP: " + JSON.stringify(guildManager.pendingGuildXP));

    simulateAddXP(mockChar, 5);
    log("State after another 5 XP: " + JSON.stringify(guildManager.pendingGuildXP));

    const total = guildManager.pendingGuildXP['guild-456'].total;
    log(`Final Total: ${total}`);

    if (total === 10.5) {
        log("SUCCESS: Guild XP accumulated correctly (10 + 0.5).");
    } else {
        log("FAILURE: Expected 10.5, found " + total);
    }

    log("\nTest finished.");
}

testGuildXP().catch(e => log(`Fatal: ${e.message}`));

