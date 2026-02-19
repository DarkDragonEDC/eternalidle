
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import { GameManager } from './GameManager.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const gameManager = new GameManager(supabase);

async function diagnose() {
    const charId = "95323ca3-85c9-4b5e-b4af-08aafa64c6ff";
    console.log("--- DIAGNÓSTICO ETERNODEV ---");

    // 1. Verificar no Banco de Dados
    const { data: dbChar } = await supabase.from('characters').select('*').eq('id', charId).single();
    console.log("DB_DATA:");
    console.log(`- Combat: ${JSON.stringify(dbChar.combat)}`);
    console.log(`- Activity: ${JSON.stringify(dbChar.current_activity)}`);

    // 2. Simular SocialManager logic
    console.log("\nSOCIAL_LOGIC_SIMULATION:");
    const combat = dbChar.combat;
    const hasCombatKeys = combat && (combat.mobId || combat.mobName || combat.mob_id || combat.mob_name);
    console.log(`- Combat Detectado? ${!!combat && !!hasCombatKeys}`);
    if (combat) {
        console.log(`- Keys em Combat: ${Object.keys(combat).join(", ")}`);
    }

    // 3. Verificar questão do isOnline
    console.log("\nCACHING_LOGIC:");
    // Como estamos num processo novo, o cache está vazio. 
    // Mas vamos ver se o ID bate com o que o SocialManager usa.
    console.log(`- ID Procurado: ${charId}`);

    process.exit(0);
}

diagnose();
