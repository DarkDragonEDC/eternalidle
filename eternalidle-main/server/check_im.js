import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: './.env' });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE env vars");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('characters')
        .select('name, state')
        .in('name', ['DarkDragon', 'Ronny', 'Eugene Lionheart', 'Brola'])

    if (error) console.error(error);
    else console.log(JSON.stringify(data.map(c => ({
        name: c.name,
        isIronman: c.state?.isIronman
    })), null, 2));
}

check();
