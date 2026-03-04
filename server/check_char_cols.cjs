
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('characters').select('*').limit(1);
    if (error) {
        console.error("DB Error:", error.message);
        return;
    }
    if (data && data[0]) {
        console.log("CHAR COLUMNS:", Object.keys(data[0]).sort().join(', '));
    } else {
        console.log("No characters found!");
    }
}

check();
