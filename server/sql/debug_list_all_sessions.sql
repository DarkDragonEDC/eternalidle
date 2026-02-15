-- DIAGNOSTIC QUERY: List ALL user sessions without grouping
-- Use this to check if the first account is using a different IP (e.g., ::1 vs 127.0.0.1)

SELECT 
    us.user_id,
    c.name as character_name,
    us.ip_address,
    us.last_active_at
FROM user_sessions us
JOIN characters c ON us.user_id = c.user_id
ORDER BY us.last_active_at DESC;
