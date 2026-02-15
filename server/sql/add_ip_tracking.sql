ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS ip_address text;

-- Index for faster searching of alts
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip ON user_sessions(ip_address);
