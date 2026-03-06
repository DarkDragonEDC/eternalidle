import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data } = await supabase.from('characters').select('name, state').eq('name', 'DarkDragon').single();
    if (data && data.state && data.state.dungeon) {
        console.log("Current Time (now) :", Date.now());
        console.log("Started At         :", data.state.dungeon.started_at);
        console.log("Finish At          :", data.state.dungeon.finish_at);
        console.log("Status             :", data.state.dungeon.status);
        console.log("Time left (ms)     :", data.state.dungeon.finish_at - Date.now());
        console.log(JSON.stringify(data.state.dungeon, null, 2));
    } else {
        console.log("No active dungeon found for DarkDragon.");
        if (data) console.log("State:", data.state);
    }
}
run();
