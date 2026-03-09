-- server/sql/multi_account_report_grouped.sql
-- Query para encontrar jogadores usando o mesmo endereço de IP (Multi-Contas)
-- Agrupando personagens por conta para evitar confusão entre Main/Ironman.

WITH characters_by_user AS (
    SELECT 
        user_id, 
        STRING_AGG(name, ', ' ORDER BY name) as char_names
    FROM characters
    GROUP BY user_id
)
SELECT 
    us.ip_address, 
    COUNT(DISTINCT us.user_id) as account_count,
    -- Exemplo de saída: "[Main, Ironman] | [OutraConta]"
    STRING_AGG(DISTINCT '[' || cbu.char_names || ']', ' | ') as grouped_characters,
    -- Lista os IDs de usuário para referência do admin
    array_agg(DISTINCT us.user_id) as user_ids,
    -- Horário da última atividade (Brasília)
    MAX(us.last_active_at) AT TIME ZONE 'America/Sao_Paulo' as last_seen_brasilia
FROM user_sessions us
JOIN characters_by_user cbu ON us.user_id = cbu.user_id
WHERE us.ip_address IS NOT NULL
-- AND us.ip_address NOT IN ('::1', '127.0.0.1') -- Opcional: Ignorar localhost
GROUP BY us.ip_address
-- Mostra apenas IPs usados por MAIS DE UMA CONTA distinta
HAVING COUNT(DISTINCT us.user_id) > 1
ORDER BY account_count DESC;
