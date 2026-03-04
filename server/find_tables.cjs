
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_tables'); // Hope this exists, or try query
    if (error) {
        // Fallback: try to select from likely names
        const names = ['trade_session', 'trade_sessions', 'trades', 'trade', 'trade_history'];
        for (const name of names) {
            const { error: e } = await supabase.from(name).select('id').limit(1);
            console.log(`Table '${name}' exists?`, !e);
        }
    } else {
        console.log("Tables:", data);
    }
}

check();
