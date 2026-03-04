
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verify() {
    const charId = '3ec05682-3886-46fd-9137-f9cb655842b6'; // DarkDragon
    console.log(`Checking recent history for DarkDragon (${charId})...`);

    const { data: combat, error: combatErr } = await supabase
        .from('combat_history')
        .select('*')
        .eq('character_id', charId)
        .order('occurred_at', { ascending: false })
        .limit(5);

    if (combatErr) console.error('Combat check error:', combatErr);
    else {
        console.log('Recent Combat Records:');
        combat.forEach(c => console.log(`- ${c.occurred_at}: ${c.mob_name} (${c.outcome}) - Kills: ${c.kills}`));
    }

    const { data: dungeon, error: dungErr } = await supabase
        .from('dungeon_history')
        .select('*')
        .eq('character_id', charId)
        .order('occurred_at', { ascending: false })
        .limit(5);

    if (dungErr) console.error('Dungeon check error:', dungErr);
    else {
        console.log('Recent Dungeon Records:');
        dungeon.forEach(d => console.log(`- ${d.occurred_at}: ${d.dungeon_name} (${d.outcome}) - Wave: ${d.wave_reached}`));
    }
}

verify();
