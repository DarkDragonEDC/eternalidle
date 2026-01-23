const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('combat_history')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching history:', error.message);
    } else {
        if (data && data.length > 0) {
            console.log('Row keys:', Object.keys(data[0]));
            console.log('Sample row:', JSON.stringify(data[0], null, 2));
        } else {
            console.log('No rows found in combat_history. (Try killing a mob first)');
            // List columns via a trick if possible, or just fail
        }
    }
}

check();
