-- 1. Create the new column
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate data from state->'equipment' to the new 'equipment' column
UPDATE characters 
SET equipment = state->'equipment'
WHERE state ? 'equipment' AND (equipment IS NULL OR equipment = '{}'::jsonb);

-- 3. Remove 'equipment' from the 'state' JSONB column
UPDATE characters 
SET state = state - 'equipment'
WHERE state ? 'equipment';
