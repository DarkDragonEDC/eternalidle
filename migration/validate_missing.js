import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);
const BACKUP_DIR = path.join(__dirname, 'backup');

async function val() {
    // 1. Check Local Map
    try {
        const idMap = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'id_map.json')));
        console.log(`ID Map entries: ${Object.keys(idMap).length}`);
    } catch (e) { console.log("Erro lendo id_map.json:", e.message); }

    // 2. Check DB Count
    const { count: usersCount } = await supabase.auth.admin.listUsers();
    console.log(`Users in DB: ${usersCount}`);

    const { data: chars, error } = await supabase.from('characters').select('name, user_id');
    if (error) console.log("Erro lendo chars:", error.message);

    console.log(`Chars in DB: ${chars?.length || 0}`);
    if (chars) {
        chars.forEach(c => console.log(` - ${c.name}`));
    }
}

val();
