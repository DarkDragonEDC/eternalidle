
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
    console.log("Checking guilds table schema...");
    const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching guild:", error);
    } else if (data.length > 0) {
        console.log("Columns available:", JSON.stringify(Object.keys(data[0]), null, 2));
    } else {
        console.log("No guilds found to check columns.");
    }
}

checkSchema();
