
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

import fs from 'fs';

async function check() {
    console.log("Querying characters...");
    const { data, error } = await supabase
        .from('characters')
        .select('id, name, current_activity, state')
        .ilike('name', '%EternoDev%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} characters.`);
    const results = data.map(c => {
        const skills = c.state?.skills || {};
        let total = 0;
        for (let k in skills) {
            if (skills[k] && skills[k].level) total += skills[k].level;
        }

        return {
            name: c.name,
            id: c.id,
            totalLevel: total,
            currentActivity: c.current_activity,
            rawSkillsLength: Object.keys(skills).length
        };
    });

    fs.writeFileSync(path.join(__dirname, 'debug_output.json'), JSON.stringify(results, null, 2));
    console.log("Written to debug_output.json");
}

check();
