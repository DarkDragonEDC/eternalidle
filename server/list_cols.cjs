
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('trade_sessions').select('*').limit(1);
    if (data && data[0]) {
        console.log("COLUMNS:", Object.keys(data[0]).join(', '));
    }
}

check();
