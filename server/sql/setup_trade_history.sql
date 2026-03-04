-- Trade History Table
CREATE TABLE IF NOT EXISTS trade_history (
    id BIGSERIAL PRIMARY KEY,
    trade_id TEXT,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    sender_name TEXT,
    receiver_name TEXT,
    sender_items JSONB DEFAULT '[]',
    sender_silver BIGINT DEFAULT 0,
    sender_tax BIGINT DEFAULT 0,
    receiver_items JSONB DEFAULT '[]',
    receiver_silver BIGINT DEFAULT 0,
    receiver_tax BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trade_history_date ON trade_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_history_sender ON trade_history(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_receiver ON trade_history(receiver_id);
