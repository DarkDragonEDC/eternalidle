import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        envVars[parts[0].trim()] = parts.slice(1).join('=').replace(/^"/, '').replace(/"$/, '').trim();
    }
});

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('characters').select('name, state').eq('name', 'DarkDragon').single();
    if (data && data.state && data.state.dungeon) {
        console.log("Current Time (now) :", Date.now());
        console.log("Started At         :", data.state.dungeon.started_at);
        console.log("Finish At          :", data.state.dungeon.finish_at);
        console.log("Status             :", data.state.dungeon.status);
        console.log("Time left (ms)     :", data.state.dungeon.finish_at - Date.now());
        console.log("Current Run        :", data.state.dungeon.currentRun);
        console.log("Repeat Count       :", data.state.dungeon.repeatCount);
    } else {
        console.log("No dungeon active in DB");
    }
}
check();
