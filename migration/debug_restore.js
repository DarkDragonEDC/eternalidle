import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.migration') });

const supabase = createClient(process.env.NEW_SUPABASE_URL, process.env.NEW_SERVICE_ROLE_KEY);

const BACKUP_DIR = path.join(__dirname, 'backup');
const ID_MAP_FILE = path.join(BACKUP_DIR, 'id_map.json');

async function debug() {
    const idMap = JSON.parse(fs.readFileSync(ID_MAP_FILE));
    const chars = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'characters.json')));

    // Pegar o primeiro que tenha mapeamento
    let char = chars.find(c => idMap[c.user_id]);

    if (!char) {
        console.log("Nenhum char com mapeamento encontrado.");
        return;
    }

    console.log("Tentando inserir char para:", char.name);
    const newId = idMap[char.user_id];

    const newRecord = { ...char };
    newRecord.id = newId;
    newRecord.user_id = newId;

    console.log("Payload:", newRecord);

    const { error } = await supabase.from('characters').insert(newRecord);
    if (error) {
        console.error("ERRO DETALHADO:", JSON.stringify(error, null, 2));
    } else {
        console.log("Sucesso no debug!");
    }
}

debug();
