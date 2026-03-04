
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
    console.log("Baixando 500 personagens para análise...");
    const { data: chars, error } = await supabase.from('characters').select('id, name, state').limit(500);

    if (error) {
        console.error("Erro no Supabase:", error);
        return;
    }

    let found = 0;
    chars.forEach(c => {
        if (!c.state) return;
        const stateStr = JSON.stringify(c.state).toLowerCase();
        if (stateStr.includes('ironman')) {
            console.log(`--- ACHOU IRONMAN ---`);
            console.log(`Char: ${c.name}`);
            console.log(`Chaves relevantes no state:`, Object.keys(c.state).filter(k => k.toLowerCase().includes('iron') || k === 'mode'));
            console.log(`Valores: ironman=${c.state.ironman}, is_ironman=${c.state.is_ironman}, mode=${c.state.mode}`);
            found++;
        }
    });

    console.log(`Análise concluída. Ironman encontrados: ${found}`);
}

run();
