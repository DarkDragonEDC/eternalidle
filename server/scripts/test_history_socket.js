
import { createClient } from '@supabase/supabase-js';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testHistorySocket() {
    const charId = '3ec05682-3886-46fd-9137-f9cb655842b6'; // DarkDragon
    const userId = '09ef498e-491c-4b68-809b-648faf91d6ff';

    console.log('--- SOCKET TEST: HISTORY LOG SAVING ---');

    const longTimeAgo = new Date(Date.now() - (13 * 60 * 60 * 1000)).toISOString();
    const { data: char } = await supabase.from('characters').select('state').eq('id', charId).single();

    const newState = {
        ...char.state,
        combat: {
            mobId: 'SOCKET_TEST_MOB',
            mobName: 'Socket Test Enemy',
            started_at: longTimeAgo,
            kills: 3,
            sessionXp: 500,
            sessionSilver: 200,
            mobMaxHealth: 100,
            mobHealth: 100,
            tier: 1
        }
    };

    console.log('1. Setting 13h-old state in DB...');
    await supabase.from('characters').update({ state: newState }).eq('id', charId);

    console.log('2. Connecting via socket to trigger catchup...');
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
        console.log('Connected to server. Emitting join_character...');
        socket.emit('join_character', { characterId: charId });
    });

    socket.on('character_update', async (data) => {
        console.log('Character update received.');
        if (!data.state.combat) {
            console.log('3. Success: Server cleared expired combat state!');
            
            // Wait for DB insertion to complete
            setTimeout(async () => {
                const { data: logs } = await supabase
                    .from('combat_history')
                    .select('*')
                    .eq('character_id', charId)
                    .eq('mob_id', 'SOCKET_TEST_MOB')
                    .single();

                if (logs) {
                    console.log('4. FINAL SUCCESS: History log saved for socket session!');
                    await supabase.from('combat_history').delete().eq('mob_id', 'SOCKET_TEST_MOB');
                } else {
                    console.error('FAILED: Log not found in DB.');
                }
                socket.disconnect();
                process.exit(0);
            }, 3000);
        }
    });

    // Timeout safety
    setTimeout(() => {
        console.error('Test timed out.');
        socket.disconnect();
        process.exit(1);
    }, 15000);
}

testHistorySocket();
