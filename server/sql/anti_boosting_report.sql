-- server/sql/anti_boosting_report.sql

-- 1. Visão Geral de Transações Suspeitas (Flags Automáticas)
-- Mostra transações marcadas pelo sistema por IP igual ou valores discrepantes.
SELECT 
    'TRADE' as tipo,
    id,
    sender_name,
    receiver_name,
    suspicion_reason,
    total_value_sender,
    total_value_receiver,
    created_at
FROM trade_history
WHERE is_suspicious = true

UNION ALL

SELECT 
    'MARKET' as tipo,
    id,
    seller_name,
    buyer_name,
    suspicion_reason,
    price_total as total_value_sender, -- No mercado o vendedor entrega o item
    0 as total_value_receiver,
    created_at
FROM market_history
WHERE is_suspicious = true
ORDER BY created_at DESC;

-- 2. Relatório de Saldo Acumulado (Net Worth Flow)
-- Identifica quem está "injetando" muita prata em outros sem receber nada em troca.
WITH trade_flow AS (
    SELECT 
        sender_id, 
        receiver_id,
        SUM(total_value_sender) as enviou,
        SUM(total_value_receiver) as recebeu
    FROM trade_history
    GROUP BY sender_id, receiver_id
),
accumulated AS (
    SELECT 
        sender_id, 
        receiver_id, 
        SUM(enviou) as total_enviado, 
        SUM(recebeu) as total_recebido
    FROM (
        SELECT sender_id, receiver_id, enviou, recebeu FROM trade_flow
        UNION ALL
        SELECT receiver_id as sender_id, sender_id as receiver_id, recebeu as enviou, enviou as recebeu FROM trade_flow
    ) s
    GROUP BY sender_id, receiver_id
)
SELECT 
    c1.name as jogador_A,
    c2.name as jogador_B,
    total_enviado as valor_A_para_B,
    total_recebido as valor_B_para_A,
    (total_enviado - total_recebido) as saldo_neto
FROM accumulated
JOIN characters c1 ON c1.id = sender_id
JOIN characters c2 ON c2.id = receiver_id
WHERE sender_id < receiver_id -- Evita duplicatas (A-B e B-A)
  AND ABS(total_enviado - total_recebido) > 500000 -- Filtra saldos significativos (> 500k)
ORDER BY ABS(total_enviado - total_recebido) DESC;

-- 3. Detecção de "Mulas"
-- Jogadores que distribuem recursos para muitos outros IPs ou IDs diferentes.
SELECT 
    sender_name,
    COUNT(DISTINCT receiver_id) as total_destinatarios,
    COUNT(DISTINCT receiver_ip) as total_ips_diferentes,
    SUM(total_value_sender) as valor_total_distribuido
FROM trade_history
GROUP BY sender_name
HAVING COUNT(DISTINCT receiver_id) > 5 AND SUM(total_value_receiver) < (SUM(total_value_sender) * 0.1)
ORDER BY valor_total_distribuido DESC;
