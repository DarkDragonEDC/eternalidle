
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkVitao() {
    console.log("Pesquisando por Vitao...");
    const { data, error } = await supabase
        .from('characters')
        .select('*')
        .ilike('name', 'Vitao');

    if (error) {
        console.error("Erro:", error);
        return;
    }

    if (data.length === 0) {
        console.log("Vitao não encontrado.");
        return;
    }

    data.forEach(c => {
        console.log(`Personagem: ${c.name} (${c.id})`);
        console.log(`- Combat (coluna): ${JSON.stringify(c.combat)}`);
        console.log(`- Dungeon (coluna): ${JSON.stringify(c.dungeon)}`);
        console.log(`- Activity (coluna): ${JSON.stringify(c.current_activity)}`);
        console.log(`- State[Combat]: ${JSON.stringify(c.state?.combat)}`);
    });
}

checkVitao();
