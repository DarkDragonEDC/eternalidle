import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envPaths = ['./.env', '../.env'];
let envLoaded = false;
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        envLoaded = true;
        break;
    }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testLeaderboardLogic(type = 'COMBAT', mode = 'NORMAL') {
    console.log(`Testing leaderboard logic for type=${type}, mode=${mode}`);
    
    let query = supabase
        .from('characters')
        .select('id, name, state, skills, info, equipment, is_admin');
        // .eq('is_admin', false); // Let's check admins too to be sure

    if (mode === 'IRONMAN') {
        query = query.contains('state', { isIronman: true });
    } else {
        query = query.not('state', 'cs', '{"isIronman": true}');
    }

    const { data, error } = await query.limit(2000);
    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log(`DB returned ${data?.length || 0} characters.`);

    const filteredAdmins = data.filter(c => !c.is_admin);
    console.log(`After is_admin check: ${filteredAdmins.length} characters.`);

    const processed = filteredAdmins.filter(c => {
        if (!c || !c.state) return false;
        if (mode === 'IRONMAN') {
            return c.state.isIronman === true;
        } else {
            return !c.state.isIronman;
        }
    });

    console.log(`After in-memory mode filter: ${processed.length} characters.`);
    
    if (processed.length > 0) {
        console.log("Sample character data from processed list:");
        console.log(` - ${processed[0].name}: Skills keys = ${Object.keys(processed[0].skills || {})}`);
    } else {
        console.log("NO CHARACTERS PASSED FILTERS.");
        console.log("Raw state samples of characters that were in DB but didn't pass:");
        data.forEach(c => {
            console.log(` - ${c.name}: is_admin=${c.is_admin}, state.isIronman=${c.state?.isIronman}`);
        });
    }
}

testLeaderboardLogic('COMBAT', 'NORMAL');
