-- server/sql/anti_boosting_report.sql

/* 
   =========================================================================
   RELATÓRIO MESTRE ANTI-BOOSTING (VISÃO UNIFICADA)
   =========================================================================
   Este relatório combina todas as detecções em uma ÚNICA TABELA.
   Isso evita que dados "sumam" em ferramentas que mostram apenas um resultado.
   
   Categorias explicadas:
   - ALTO_RISCO_IP: Jogadores trocando itens no mesmo endereço IP.
   - FLUXO_SUSPEITO: Grandes quantias de prata indo de um lado só.
   - RANKING_MULA: Contas que distribuem pra muitos e não recebem nada.
   - LOG_HISTORICO: Registro de todas as transações marcadas pelo servidor.
   =========================================================================
*/

-- QUERY UNIFICADA (Tudo em um único resultado)
WITH 
-- 1. Detecção de IP Igual
detect_ip AS (
    SELECT 
        'ALTO_RISCO_IP' as "Categoria",
        sender_name || ' -> ' || receiver_name as "Envolvidos",
        suspicion_reason as "Detalhes",
        total_value_sender as "Valor",
        created_at as "Data"
    FROM trade_history WHERE is_suspicious = true AND sender_ip = receiver_ip
),
-- 2. Saldo Acumulado (Acima de 10k)
detect_balance AS (
    SELECT 
        'FLUXO_SUSPEITO' as "Categoria",
        sender_name || ' <-> ' || receiver_name as "Envolvidos",
        'Saldo Líquido: ' || (SUM(total_value_sender) - SUM(total_value_receiver)) as "Detalhes",
        ABS(SUM(total_value_sender) - SUM(total_value_receiver)) as "Valor",
        MAX(created_at) as "Data"
    FROM trade_history 
    GROUP BY sender_name, receiver_name, sender_id, receiver_id
    HAVING ABS(SUM(total_value_sender) - SUM(total_value_receiver)) > 10000 
),
-- 3. Ranking de Mulas (ex: roxx)
detect_mules AS (
    SELECT 
        'RANKING_MULA' as "Categoria",
        sender_name as "Envolvidos",
        'Distribuiu para ' || COUNT(DISTINCT receiver_id) || ' contas. Retorno: ' || ROUND((SUM(total_value_receiver)::numeric / NULLIF(SUM(total_value_sender), 0)) * 100, 2) || '%' as "Detalhes",
        SUM(total_value_sender) as "Valor",
        MAX(created_at) as "Data"
    FROM trade_history
    GROUP BY sender_name
    HAVING COUNT(DISTINCT receiver_id) >= 2 AND SUM(total_value_sender) > 1000
       AND SUM(total_value_receiver) < (SUM(total_value_sender) * 0.3)
),
-- 4. Log Geral de Flags
detect_logs AS (
    SELECT 
        'LOG_HISTORICO' as "Categoria",
        sender_name || ' -> ' || receiver_name as "Envolvidos",
        'Motivo: ' || suspicion_reason as "Detalhes",
        total_value_sender as "Valor",
        created_at as "Data"
    FROM trade_history WHERE is_suspicious = true
)

-- Resultado Final Unificado
SELECT * FROM detect_ip
UNION ALL
SELECT * FROM detect_balance
UNION ALL
SELECT * FROM detect_mules
UNION ALL
SELECT * FROM detect_logs
ORDER BY "Categoria" ASC, "Valor" DESC;
