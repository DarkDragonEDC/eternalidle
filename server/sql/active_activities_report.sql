-- Query to list unique players (accounts) with an active activity and elapsed time
-- Shows only the longest running activity if a player has multiple characters active.

SELECT DISTINCT ON (user_id)
    name AS player_name,
    CASE 
        WHEN current_activity IS NOT NULL THEN (current_activity->>'type')
        WHEN combat IS NOT NULL THEN 'COMBAT'
        WHEN dungeon IS NOT NULL THEN 'DUNGEON'
        ELSE 'NONE'
    END AS activity_type,
    activity_started_at,
    CASE 
        WHEN activity_started_at IS NOT NULL THEN 
            NOW() - activity_started_at::timestamp
        ELSE NULL 
    END AS elapsed_time,
    CASE 
        WHEN current_activity IS NOT NULL THEN (current_activity->>'item_id')
        ELSE NULL 
    END AS details
FROM 
    characters
WHERE 
    (current_activity IS NOT NULL 
    OR combat IS NOT NULL 
    OR dungeon IS NOT NULL)
    AND is_admin = false
ORDER BY 
    user_id, -- Required for DISTINCT ON
    elapsed_time DESC;
