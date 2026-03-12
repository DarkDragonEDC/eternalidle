-- MIGRAÇÃO PERMANENTE: SHIELD -> SHEATH
-- Este script atualiza todas as referências de SHIELD para SHEATH no banco de dados.

BEGIN;

-- 1. Atualizar a tabela de personagens (Inventário e Equipamento)
-- Substitui todas as chaves "SHIELD" por "SHEATH" no JSONB.
-- Nota: PostgreSQL não tem um "replace_key" nativo simples, então usamos regex_replace na string JSON e convertemos de volta.
UPDATE characters 
SET state = (
    regexp_replace(state::text, '"T([0-9]+)_SHIELD(_Q[0-9]+)?"', '"T\1_SHEATH\2"', 'g')
)::jsonb
WHERE state::text ~ '"T[0-9]+_SHIELD(_Q[0-9]+)?"';

-- 2. Atualizar a tabela de listagens do mercado (market_listings)
-- Atualiza o item_id
UPDATE market_listings
SET item_id = regexp_replace(item_id, 'T([0-9]+)_SHIELD', 'T\1_SHEATH')
WHERE item_id ~ 'T[0-9]+_SHIELD';

-- Atualiza o item_data (JSONB) - ID e Nome
UPDATE market_listings
SET item_data = (
    regexp_replace(
        regexp_replace(item_data::text, '"T([0-9]+)_SHIELD(_Q[0-9]+)?"', '"T\1_SHEATH\2"', 'g'),
        '"([0-9]+)_Shield"', '"\1_Sheath"', 'g'
    )
)::jsonb
WHERE item_data::text ~ '"T[0-9]+_SHIELD(_Q[0-9]+)?"' OR item_data::text ~ '"[0-9]+_Shield"';

-- 3. Atualizar a tabela de histórico do mercado (market_history)
-- Atualiza o item_id
UPDATE market_history
SET item_id = regexp_replace(item_id, 'T([0-9]+)_SHIELD', 'T\1_SHEATH')
WHERE item_id ~ 'T[0-9]+_SHIELD';

-- Atualiza o item_data (JSONB) - ID e Nome
UPDATE market_history
SET item_data = (
    regexp_replace(
        regexp_replace(item_data::text, '"T([0-9]+)_SHIELD(_Q[0-9]+)?"', '"T\1_SHEATH\2"', 'g'),
        '"([0-9]+)_Shield"', '"\1_Sheath"', 'g'
    )
)::jsonb
WHERE item_data::text ~ '"T[0-9]+_SHIELD(_Q[0-9]+)?"' OR item_data::text ~ '"[0-9]+_Shield"';

COMMIT;
