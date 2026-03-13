-- Query to list each player with an active activity and elapsed time
-- This includes Gathering, Refining, Crafting (current_activity), Combat, and Dungeons.

SELECT 
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
    current_activity IS NOT NULL 
    OR combat IS NOT NULL 
    OR dungeon IS NOT NULL
ORDER BY 
    elapsed_time DESC;
