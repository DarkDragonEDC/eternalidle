
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSchema() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    console.log("Checking guilds table schema...");
    const { data: guild, error } = await supabase
        .from('guilds')
        .select('*')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Error fetching guild:", error);
    } else if (guild) {
        console.log("Columns found in 'guilds' table:", Object.keys(guild));
    } else {
        console.log("No guilds found to check columns, attempting to select a specific column...");
        const { error: colError } = await supabase.from('guilds').select('library_level').limit(1);
        if (colError) {
            console.error("Error selecting 'library_level':", colError.message);
        } else {
            console.log("'library_level' column exists.");
        }
    }
}

checkSchema();
