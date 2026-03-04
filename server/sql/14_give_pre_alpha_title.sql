-- 14_give_pre_alpha_title.sql
-- Esse script verifica todos os personagens e asgura que eles tenham o título "Pre-Alpha Player" 
-- no seu array de 'unlockedTitles' dentro da coluna jsonb 'info'.

UPDATE public.characters
SET info = jsonb_set(
    COALESCE(info, '{}'::jsonb), 
    '{unlockedTitles}', 
    (
        SELECT jsonb_agg(DISTINCT title)
        FROM jsonb_array_elements_text(
            COALESCE(info->'unlockedTitles', '[]'::jsonb) || '["Pre-Alpha Player"]'::jsonb
        ) AS title
    )
)
WHERE NOT (COALESCE(info->'unlockedTitles', '[]'::jsonb) @> '["Pre-Alpha Player"]'::jsonb);
