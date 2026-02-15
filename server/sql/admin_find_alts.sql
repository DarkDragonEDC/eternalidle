-- Query to find players using the same IP address (Multi-Accounting)

SELECT 
    us.ip_address, 
    COUNT(DISTINCT us.user_id) as account_count,
    -- List character names associated with these accounts
    array_agg(DISTINCT c.name) as character_names,
    -- List the user IDs for admin reference
    array_agg(DISTINCT us.user_id) as user_ids,
    -- Show when they were last active
    MAX(us.last_active_at) as last_seen
FROM user_sessions us
-- Join with characters to get readable names
JOIN characters c ON us.user_id = c.user_id
WHERE us.ip_address IS NOT NULL
-- Ignore localhost ipv6 for dev environments if needed, but useful to see
-- AND us.ip_address != '::1' 
GROUP BY us.ip_address
-- Only show IPs used by more than one account
HAVING COUNT(DISTINCT us.user_id) > 1
ORDER BY account_count DESC;
