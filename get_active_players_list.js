import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listActivePlayers() {
    try {
        const { data: chars, error } = await supabase
            .from('characters')
            .select('name, current_activity, state, activity_started_at, user_id')
            .or('current_activity.not.is.null,state->combat.not.is.null,state->dungeon.not.is.null');

        if (error) throw error;

        if (!chars || chars.length === 0) {
            console.log("Nenhum jogador ativo no momento.");
            return;
        }

        const now = new Date();
        console.log(`Lista de Jogadores Ativos - ${now.toLocaleString('pt-BR')}\n`);
        console.log(`${'Nome'.padEnd(20)} | ${'Atividade'.padEnd(30)} | ${'Duração'}`);
        console.log('-'.repeat(65));

        chars.forEach(char => {
            let activityName = 'Idle';
            let startTime = null;

            if (char.state.dungeon) {
                activityName = `Dungeon: ${char.state.dungeon.id} (Wave ${char.state.dungeon.wave})`;
                startTime = new Date(char.state.dungeon.started_at);
            } else if (char.state.combat) {
                activityName = `Combat: ${char.state.combat.mobName}`;
                startTime = new Date(char.state.combat.started_at);
            } else if (char.current_activity) {
                activityName = `${char.current_activity.type}: ${char.current_activity.item_id}`;
                startTime = new Date(char.activity_started_at);
            }

            let durationStr = 'Desconhecido';
            if (startTime && !isNaN(startTime.getTime())) {
                const diffMs = now - startTime;
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                const diffSecs = Math.floor((diffMs % 60000) / 1000);
                durationStr = `${diffHrs}h ${diffMins}m ${diffSecs}s`;
            }

            console.log(`${char.name.padEnd(20)} | ${activityName.padEnd(30)} | ${durationStr}`);
        });

    } catch (err) {
        console.error("Erro ao listar jogadores:", err.message);
    }
}

listActivePlayers();
