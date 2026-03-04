-- SQL Script to Inject Dev Items for Character <DevIron>
-- Copy and run this in the Supabase SQL Editor

DO $$
DECLARE
    char_id UUID;
    v_inventory JSONB := '{}'::jsonb;
    v_state JSONB;
    t INT;
    q INT;
    s INT;
    slot TEXT;
    eff TEXT;
    base_id TEXT;
    storage_key TEXT;
    rune_id TEXT;
BEGIN
    -- 1. Get character ID and current state
    SELECT id, state INTO char_id, v_state FROM characters WHERE name = '<DevIron>' LIMIT 1;
    
    IF char_id IS NULL THEN
        RAISE NOTICE 'Character <DevIron> not found';
        RETURN;
    END IF;

    -- 2. Generate Mage Gear (350 items: 10 Tiers x 7 Slots x 5 Qualities)
    FOR t IN 1..10 LOOP
        FOR slot IN SELECT * FROM unnest(ARRAY['FIRE_STAFF', 'TOME', 'CLOTH_ARMOR', 'CLOTH_HELMET', 'CLOTH_BOOTS', 'CLOTH_GLOVES', 'CAPE']) LOOP
            FOR q IN 0..4 LOOP
                base_id := 'T' || t || '_' || slot;
                -- Unique key for each quality: ItemID::Q{n}::DevIron
                storage_key := CASE WHEN q = 0 THEN base_id ELSE base_id || '::Q' || q || '::DevIron' END;
                v_inventory := v_inventory || jsonb_build_object(storage_key, jsonb_build_object('amount', 1, 'quality', q, 'craftedBy', 'DevIron'));
            END LOOP;
        END LOOP;
    END LOOP;

    -- 3. Generate Combat Runes (200 items: 10 Tiers x 4 Effects x 5 Stars)
    FOR t IN 1..10 LOOP
        FOR eff IN SELECT * FROM unnest(ARRAY['ATTACK', 'SAVE_FOOD', 'BURST', 'ATTACK_SPEED']) LOOP
            -- Generating 1 to 5 stars (1-3 standard, 4-5 bonus)
            FOR s IN 1..5 LOOP
                rune_id := 'T' || t || '_RUNE_ATTACK_' || eff || '_' || s || 'STAR';
                v_inventory := v_inventory || jsonb_build_object(rune_id, jsonb_build_object('amount', 1, 'stars', s));
            END LOOP;
        END LOOP;
    END LOOP;

    -- 4. Update state with new inventory and slots
    -- We use || to MERGE with existing state, but we REPLACE the inventory object for a clean slate
    v_state := v_state || jsonb_build_object('extraInventorySlots', 9999, 'inventory', v_inventory);
    
    UPDATE characters SET state = v_state WHERE id = char_id;
    
    RAISE NOTICE 'Successfully updated <DevIron> with 550 items and 9999 slots';
END $$;
