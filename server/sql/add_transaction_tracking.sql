-- server/sql/add_transaction_tracking.sql

-- Atualização da tabela trade_history
ALTER TABLE trade_history 
ADD COLUMN IF NOT EXISTS sender_ip text,
ADD COLUMN IF NOT EXISTS receiver_ip text,
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicion_reason text,
ADD COLUMN IF NOT EXISTS total_value_sender bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_value_receiver bigint DEFAULT 0;

-- Índices para busca rápida de IPs suspeitos em trades
CREATE INDEX IF NOT EXISTS idx_trade_history_sender_ip ON trade_history(sender_ip);
CREATE INDEX IF NOT EXISTS idx_trade_history_receiver_ip ON trade_history(receiver_ip);
CREATE INDEX IF NOT EXISTS idx_trade_history_suspicious ON trade_history(is_suspicious) WHERE is_suspicious = true;

-- Atualização da tabela market_history
ALTER TABLE market_history 
ADD COLUMN IF NOT EXISTS seller_ip text,
ADD COLUMN IF NOT EXISTS buyer_ip text,
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS suspicion_reason text;

-- Índices para busca rápida de IPs suspeitos no mercado
CREATE INDEX IF NOT EXISTS idx_market_history_seller_ip ON market_history(seller_ip);
CREATE INDEX IF NOT EXISTS idx_market_history_buyer_ip ON market_history(buyer_ip);
CREATE INDEX IF NOT EXISTS idx_market_history_suspicious ON market_history(is_suspicious) WHERE is_suspicious = true;
