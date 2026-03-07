import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching guilds:", error);
    } else {
        console.log("Guilds columns:", data[0] ? Object.keys(data[0]) : "No data");
    }
}

checkSchema();
