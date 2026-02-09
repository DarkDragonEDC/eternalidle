-- 1. Create the new column
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate data from state->'skills' to the new 'skills' column
UPDATE characters 
SET skills = state->'skills'
WHERE state ? 'skills' AND (skills IS NULL OR skills = '{}'::jsonb);

-- 3. Remove 'skills' from the 'state' JSONB column
UPDATE characters 
SET state = state - 'skills'
WHERE state ? 'skills';
