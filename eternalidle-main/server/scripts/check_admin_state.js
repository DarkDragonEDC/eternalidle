import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkAdminState() {
    const { data: characters, error } = await supabase
        .from('characters')
        .select('name, state')
        .ilike('name', '%admin%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    characters.forEach(char => {
        console.log(`\n--- Character: ${char.name} ---`);
        console.log("State keys:", Object.keys(char.state));
        if (char.state.inventory) {
            const itemCount = Object.keys(char.state.inventory).length;
            console.log(`Inventory Item Count: ${itemCount}`);
            console.log("First 5 Inventory Items:", Object.entries(char.state.inventory).slice(0, 5));
        } else {
            console.log("Inventory field is missing or empty.");
        }
    });
}

checkAdminState();
