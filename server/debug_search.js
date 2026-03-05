import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testSearch() {
    console.log("Testing search with empty query...");
    const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Error with empty query:", error);
    } else {
        console.log("Empty search found:", data.length, "results.");
        if (data.length > 0) {
            console.log("First result:", data[0].name, "[", data[0].tag, "]");
        }
    }
}

testSearch();
