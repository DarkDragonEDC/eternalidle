
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('friends').select('*').limit(1);
    if (error) {
        console.error("DB Error:", error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log("FRIENDS COLUMNS:", Object.keys(data[0]).sort().join(', '));
    } else {
        // If no data, we can try to get the column names another way
        console.log("No friendship data found to inspect columns.");
        // Try selecting something that definitely exists
        const { data: colsData, error: colsError } = await supabase.from('friends').select('id').limit(1);
        if (colsError) console.error("Could not even select ID:", colsError.message);
        else console.log("ID column exists.");
    }
}

check();
