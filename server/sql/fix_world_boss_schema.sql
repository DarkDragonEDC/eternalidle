-- Fix World Boss Attempts table schema and constraints
DO $$ 
BEGIN
    -- 1. Drop the old absolute unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_boss_attempts_character_id_date_key') THEN
        ALTER TABLE world_boss_attempts DROP CONSTRAINT world_boss_attempts_character_id_date_key;
    END IF;

    -- 2. Ensure damage is BIGINT
    ALTER TABLE world_boss_attempts ALTER COLUMN damage TYPE BIGINT;

    -- 3. Re-ensure partial unique indexes exist
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_world_boss_attempts_daily') THEN
        CREATE UNIQUE INDEX idx_world_boss_attempts_daily 
        ON world_boss_attempts (character_id, date) 
        WHERE session_id IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_world_boss_attempts_session') THEN
        CREATE UNIQUE INDEX idx_world_boss_attempts_session 
        ON world_boss_attempts (character_id, session_id) 
        WHERE session_id IS NOT NULL;
    END IF;

    -- 4. Add UPDATE policy if RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'world_boss_attempts' AND rowsecurity = true) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'world_boss_attempts' AND policyname = 'Server update world boss attempts') THEN
            CREATE POLICY "Server update world boss attempts" ON world_boss_attempts
                FOR UPDATE USING (true);
        END IF;
    END IF;
END $$;
