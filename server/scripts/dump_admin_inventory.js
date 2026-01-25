import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function dumpAdminInventory() {
    const { data: characters, error } = await supabase
        .from('characters')
        .select('name, state')
        .ilike('name', '%admin%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (characters.length === 0) {
        console.log("No admin character found.");
        return;
    }

    const char = characters[0];
    console.log(`Character: ${char.name}`);
    console.log("Inventory JSON:");
    console.log(JSON.stringify(char.state.inventory, null, 2));
}

dumpAdminInventory();
