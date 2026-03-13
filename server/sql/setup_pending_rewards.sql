-- Tabela para armazenar compensações e recompensas que aguardam aplicação segura
CREATE TABLE IF NOT EXISTS pending_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    xp_gained JSONB DEFAULT '{}',     -- Ex: {"COMBAT": 1000}
    silver_gained BIGINT DEFAULT 0,
    loot_gained JSONB DEFAULT '{}',   -- Ex: {"IRON_ORE": 50}
    reason TEXT,
    applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida de recompensas não aplicadas
CREATE INDEX IF NOT EXISTS idx_pending_rewards_character_applied ON pending_rewards(character_id) WHERE (applied = FALSE);
