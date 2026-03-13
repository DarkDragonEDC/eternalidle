-- Jogadores que iniciaram combate nas últimas 9 horas
SELECT 
    c.name AS "Jogador",
    COUNT(h.id) AS "Total de Combates",
    STRING_AGG(DISTINCT h.mob_name, ', ') AS "Monstros Enfrentados",
    COUNT(CASE WHEN h.outcome = 'VICTORY' THEN 1 END) AS "Vitórias",
    COUNT(CASE WHEN h.outcome = 'DEFEAT' THEN 1 END) AS "Derrotas",
    COUNT(CASE WHEN h.outcome = 'FLEE' THEN 1 END) AS "Fugas",
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
