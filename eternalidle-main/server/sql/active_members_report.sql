-- Relatório de Jogadores com Membership Ativo (1 por conta)
-- Garante que pegue sempre o PRIMEIRO personagem criado (Main) em vez de ordem alfabética
SELECT * FROM (
    SELECT DISTINCT ON (user_id)
        name AS "Jogador",
        to_timestamp((info->'membership'->>'startedAt')::bigint / 1000) AT TIME ZONE 'America/Sao_Paulo' AS "Data de Ativação (Brasília)",
        to_timestamp((info->'membership'->>'expiresAt')::bigint / 1000) AT TIME ZONE 'America/Sao_Paulo' AS "Válido Até (Brasília)"
    FROM 
        public.characters
    WHERE 
        (info->'membership'->>'active')::boolean = true
        AND (info->'membership'->>'expiresAt')::bigint > extract(epoch from now()) * 1000
    ORDER BY 
        user_id, created_at ASC
) sub
ORDER BY 
    "Válido Até (Brasília)" ASC;
