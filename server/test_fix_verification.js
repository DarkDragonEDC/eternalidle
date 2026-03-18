import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { GameManager } from './GameManager.js';

dotenv.config();

async function run() {
    try {
        console.log("Connecting to Supabase...");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        const gameManager = new GameManager(supabase, null);

        // 1. Create a test user via Admin API
        const email = `test_res_${Date.now()}@testgame.com`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: 'TestPassword123!',
            email_confirm: true
        });

        if (authError) throw new Error("Auth error: " + authError.message);
        const userId = authData.user.id;
        const charName = `Fix_${Date.now().toString().slice(-4)}`;

        console.log(`Step 1: Creating character "${charName}"...`);
        let newChar = await gameManager.createCharacter(userId, charName, false);
        
        // --- ADD ITEMS TO INVENTORY BEFORE SAVING ---
        // Note: New characters start empty (except quests reward eventually), but let's force an item.
        console.log("Step 2: Adding a test item to inventory...");
        gameManager.inventoryManager.addItemToInventory(newChar, 'T1_WOOD', 50);
        gameManager.markDirty(newChar.id);
        
        console.log("In-memory inventory size:", Object.keys(newChar.state.inventory || {}).length);
        if (!newChar.state.inventory || Object.keys(newChar.state.inventory).length === 0) {
             console.error("❌ CRITICAL: Inventory missing in memory after addition!");
        }

        // 2. Simulate Save (Persist)
        // This is where the bug occurred: it would see an empty state.inventory and overwrite the column.
        console.log("Step 3: Simulating Persistence (Save)...");
        await gameManager.persistence.persistCharacter(newChar.id);
        console.log("✅ Save complete.");

        // 3. Clear Cache and Load from DB
        console.log("Step 4: Clearing cache and re-loading from DB to verify...");
        gameManager.cache.delete(newChar.id);
        const loadedChar = await gameManager.getCharacter(userId, newChar.id, true);
        
        console.log("Loaded inventory:", loadedChar.state.inventory);
        
        if (loadedChar.state.inventory && loadedChar.state.inventory['T1_WOOD'] === 50) {
            console.log("✅ SUCCESS: Inventory preserved correctly after save!");
        } else {
            console.error("❌ FAILURE: Inventory was WIPED or lost during save!");
        }

        // Cleanup
        console.log("Cleaning up test user and character...");
        await gameManager.deleteCharacter(userId, newChar.id);
        await supabase.auth.admin.deleteUser(userId);
        console.log("✅ Cleanup complete.");

        process.exit(loadedChar.state.inventory?.['T1_WOOD'] === 50 ? 0 : 1);

    } catch (e) {
        console.error("❌ Verification failed:", e);
        process.exit(1);
    }
}

run();
