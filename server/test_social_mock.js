
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import { GameManager } from './GameManager.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function test() {
    console.log("TEST_START_MOCK");
    const charId = "95323ca3-85c9-4b5e-b4af-08aafa64c6ff";

    try {
        const friends = await gameManager.socialManager.getFriends(charId);
        if (friends.length === 0) {
            console.log("No friends found to mock.");
            process.exit(0);
        }

        const friendToMock = friends[0];
        console.log(`Mocking Combat for: ${friendToMock.friendName} (${friendToMock.friendId})`);

        // Force this friend into cache as ONLINE
        gameManager.cache.set(friendToMock.friendId, {
            id: friendToMock.friendId,
            name: friendToMock.friendName,
            state: {
                combat: { mobId: 'slime_king', mobName: 'Slime King' },
                current_activity: { type: 'CRAFTING', item_id: 'T4_PLATE' }
            }
        });

        const updatedFriends = await gameManager.socialManager.getFriends(charId);
        const mocked = updatedFriends.find(f => f.friendId === friendToMock.friendId);

        const actNames = mocked.activities.map(a => a.type + ":" + a.itemId).join(" | ");
        console.log(`MOCKED_FRIEND:${mocked.friendName} | ACTS:[${actNames}]`);
        console.log(`MOCK_CURRENT_ACT:${JSON.stringify(mocked.currentActivity)}`);

    } catch (err) {
        console.log("ERROR:" + err.message);
    }
    console.log("TEST_END");
    process.exit(0);
}

test();
