import { supabase } from './services/supabase.js';
import fs from 'fs';

async function runReport() {
    const query = `
    SELECT 
        c.name AS "Jogador",
        COUNT(h.id) AS "Total de Combates",
        MIN(h.occurred_at) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' AS "Primeiro Combate (9h)",
        MAX(h.occurred_at) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' AS "Último Combate",
        SUM(h.xp_gained) AS "XP Total",
        SUM(h.silver_gained) AS "Silver Total"
    FROM 
        public.characters c
    JOIN 
        public.combat_history h ON c.id = h.character_id
    WHERE 
        h.occurred_at >= NOW() - INTERVAL '9 hours'
    GROUP BY 
        c.name
    ORDER BY 
        MAX(h.occurred_at) DESC;
    `;

    try {
        const { data, error } = await supabase.rpc('run_sql', { sql_query: query });
        
        // Se RPC falhar (pode não existir), tentamos via postgrest se possível ou informamos
        if (error) {
            console.error("Erro ao executar query via RPC:", error.message);
            console.log("Dica: Se o RPC 'run_sql' não existir, você precisará executar o SQL diretamente no dashboard do Supabase.");
            return;
        }

        console.table(data);
    } catch (err) {
        console.error("Erro inesperado:", err);
    }
}

runReport();
