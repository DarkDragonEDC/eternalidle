-- Create world_boss_sessions table
CREATE TABLE IF NOT EXISTS world_boss_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    max_hp BIGINT NOT NULL,
    current_hp BIGINT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add session_id to world_boss_attempts
ALTER TABLE world_boss_attempts 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES world_boss_sessions(id) ON DELETE CASCADE;

-- Drop old constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_boss_attempts_character_id_date_key') THEN
        ALTER TABLE world_boss_attempts DROP CONSTRAINT world_boss_attempts_character_id_date_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_boss_attempts_char_session_key') THEN
        ALTER TABLE world_boss_attempts DROP CONSTRAINT world_boss_attempts_char_session_key;
    END IF;
END $$;

-- Unique constraint for Daily Boss (Ancient Dragon) - one attempt per character per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_world_boss_attempts_daily 
ON world_boss_attempts (character_id, date) 
WHERE session_id IS NULL;

-- Unique constraint for Window Bosses - one attempt per character per session
CREATE UNIQUE INDEX IF NOT EXISTS idx_world_boss_attempts_session 
ON world_boss_attempts (character_id, session_id) 
WHERE session_id IS NOT NULL;

-- Atomic HP deduction function (for Window Bosses)
CREATE OR REPLACE FUNCTION deduct_world_boss_hp(session_id UUID, damage BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE world_boss_sessions
    SET current_hp = GREATEST(0, current_hp - damage)
    WHERE id = session_id AND status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
