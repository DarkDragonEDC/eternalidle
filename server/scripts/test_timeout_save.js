
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testTimeoutSave() {
    const charId = '3ec05682-3886-46fd-9137-f9cb655842b6'; // DarkDragon

    console.log('--- TEST: IDLE TIMEOUT LOG SAVING ---');

    // 1. Manually set a combat state in character to simulate long session
    // started_at set to 13 hours ago (triggers timeout for both free and premium)
    const longTimeAgo = new Date(Date.now() - (13 * 60 * 60 * 1000)).toISOString();

    const { data: char } = await supabase.from('characters').select('state').eq('id', charId).single();
    if (!char) {
        console.error('Character not found');
        return;
    }

    const newState = {
        ...char.state,
        combat: {
            mobId: 'TIMEOUT_TEST_MOB',
            mobName: 'Timeout Test Dummy',
            started_at: longTimeAgo,
            kills: 5,
            sessionXp: 1000,
            sessionSilver: 500,
            mobMaxHealth: 100,
            mobHealth: 100,
            tier: 1
        }
    };

    console.log('1. Setting character into 13h-old combat session...');
    await supabase.from('characters').update({ state: newState }).eq('id', charId);

    console.log('2. Waiting for server to process tick (should happen within seconds)...');
    console.log('   (Make sure the server is running locally)');

    // Wait for a few ticks
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Check if combat state was cleared by the server
    const { data: charAfter } = await supabase.from('characters').select('state').eq('id', charId).single();
    if (charAfter.state.combat) {
        console.log('! Combat state still exists. Server tick may not have processed yet or IDLE_LIMIT logic skipped.');
    } else {
        console.log('3. Victory: Server cleared the combat state due to timeout!');
    }

    // 4. Check if a log entry was created for TIMEOUT_TEST_MOB
    const { data: logs } = await supabase
        .from('combat_history')
        .select('*')
        .eq('character_id', charId)
        .eq('mob_id', 'TIMEOUT_TEST_MOB')
        .single();

    if (logs) {
        console.log('4. SUCCESS: History log found for timeout session!');
        console.log(`   - Outcome: ${logs.outcome}`);
        console.log(`   - Kills: ${logs.kills}`);
        // Cleanup
        await supabase.from('combat_history').delete().eq('mob_id', 'TIMEOUT_TEST_MOB');
    } else {
        console.error('FAILED: No history log found for timeout session.');
    }
}

testTimeoutSave();
