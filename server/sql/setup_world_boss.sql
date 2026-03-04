-- Create World Boss Attempts table
CREATE TABLE IF NOT EXISTS world_boss_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    damage BIGINT NOT NULL DEFAULT 0,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, date)
);

-- Index for ranking queries
CREATE INDEX IF NOT EXISTS idx_wb_attempts_date_damage ON world_boss_attempts (date, damage DESC);

-- Enable RLS
ALTER TABLE world_boss_attempts ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read all (for ranking), but only insert/update their own
CREATE POLICY "Users can view all world boss attempts" ON world_boss_attempts
    FOR SELECT USING (true);

CREATE POLICY "Characters can insert their own attempts" ON world_boss_attempts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM characters 
            WHERE id = character_id AND user_id = auth.uid()
        )
    );
