-- SQL Migration: Add ON DELETE CASCADE to history tables character references

-- 1. combat_history
ALTER TABLE combat_history 
  DROP CONSTRAINT IF EXISTS combat_history_character_id_fkey,
  ADD CONSTRAINT combat_history_character_id_fkey 
    FOREIGN KEY (character_id) 
    REFERENCES characters(id) 
    ON DELETE CASCADE;

-- 2. dungeon_history
ALTER TABLE dungeon_history 
  DROP CONSTRAINT IF EXISTS dungeon_history_character_id_fkey,
  ADD CONSTRAINT dungeon_history_character_id_fkey 
    FOREIGN KEY (character_id) 
    REFERENCES characters(id) 
    ON DELETE CASCADE;

-- 3. world_boss_attempts (Already has it in schema, but ensuring for consistency)
ALTER TABLE world_boss_attempts 
  DROP CONSTRAINT IF EXISTS world_boss_attempts_character_id_fkey,
  ADD CONSTRAINT world_boss_attempts_character_id_fkey 
    FOREIGN KEY (character_id) 
    REFERENCES characters(id) 
    ON DELETE CASCADE;
