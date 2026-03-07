-- Add tasks column to guilds table to store active daily tasks
ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS daily_tasks JSONB DEFAULT '[]';

-- Add a column to track the last task reset date
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS tasks_last_reset TIMESTAMPTZ DEFAULT '-infinity';
