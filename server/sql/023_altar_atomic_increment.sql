-- Function to atomically increment altar progress and character ranking
-- Renamed to v3 to bypass any Supabase schema cache issues
CREATE OR REPLACE FUNCTION increment_altar_v3(
    char_id UUID,
    amount BIGINT,
    target_date_val TEXT
) RETURNS JSON AS $$
DECLARE
    new_global_total BIGINT;
    new_player_total BIGINT;
    char_name TEXT;
    target_date_d DATE := target_date_val::DATE;
BEGIN
    -- 1. Update Global Altar
    INSERT INTO global_altar (id, target_date, total_silver, last_updated)
    VALUES ('global', target_date_d, amount, NOW())
    ON CONFLICT (id) DO UPDATE
    SET 
        total_silver = CASE 
            WHEN global_altar.target_date = target_date_d THEN global_altar.total_silver + amount
            ELSE amount
        END,
        target_date = target_date_d,
        last_updated = NOW()
    RETURNING total_silver INTO new_global_total;

    -- 2. Update Character Ranking
    UPDATE characters
    SET ranking_altar_donated = COALESCE(ranking_altar_donated, 0) + amount
    WHERE id = char_id
    RETURNING ranking_altar_donated, name INTO new_player_total, char_name;

    -- 3. Sync to Leaderboards table
    INSERT INTO leaderboards (character_id, ranking_type, value, character_name, updated_at)
    VALUES (char_id, 'ALTAR_DONATION', new_player_total, char_name, NOW())
    ON CONFLICT (character_id, ranking_type) DO UPDATE
    SET 
        value = EXCLUDED.value,
        character_name = EXCLUDED.character_name,
        updated_at = NOW();

    RETURN json_build_object(
        'new_global_total', new_global_total,
        'new_player_total', new_player_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
