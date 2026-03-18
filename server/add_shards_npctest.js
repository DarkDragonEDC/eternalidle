import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: char, error } = await supabase
        .from('characters')
        .select('*')
        .ilike('name', 'npctest')
        .maybeSingle();

    if (error || !char) {
        console.error("Não achei o personagem npctest:", error);
        return;
    }

    const state = char.state || {};
    if (!state.inventory) state.inventory = {};

    const itemId = 'T1_BATTLE_RUNE_SHARD';
    state.inventory[itemId] = (Number(state.inventory[itemId]) || 0) + 990;

    const { error: updateError } = await supabase
        .from('characters')
        .update({ state })
        .eq('id', char.id);

    if (updateError) {
        console.error("Erro ao dar update:", updateError);
    } else {
        console.log("990 Battle Rune Shards adicionados com sucesso ao npctest!");
    }
}

run();
