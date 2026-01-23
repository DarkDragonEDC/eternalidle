const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file in the same directory
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
    console.log("Checking combat_history schema...");
    const { data, error } = await supabase
        .from('combat_history')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching history:', error.message);
    } else {
        if (data && data.length > 0) {
            console.log('Row keys:', Object.keys(data[0]));
            // Check for specific columns
            const row = data[0];
            console.log('Has occurred_at?', 'occurred_at' in row);
            console.log('Has kills?', 'kills' in row);
            console.log('Sample Row:', JSON.stringify(row, null, 2));
        } else {
            console.log('No rows found. Attempting to insert dummy row to see columns returned...');
            // Try to insert a dummy row to see if it allows it and what it returns
            // Note: this might fail if foreign keys (character_id) are required. 
            // Better to just trust that if rows exist, keys are correct.
        }
    }
}

check();
