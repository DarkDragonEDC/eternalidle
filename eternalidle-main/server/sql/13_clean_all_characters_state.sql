-- 13_clean_all_characters_state.sql
-- Esse script percorre todas as colunas de "characters" e reseta os valores
-- mantendo SOMENTE o que foi solicitado.

DO $$ 
DECLARE
    col_record RECORD;
    update_str TEXT;
BEGIN
    -- Vamos construir a cláusula SET do UPDATE dinamicamente
    update_str := 'UPDATE public.characters SET ';
    
    -- Começamos com a coluna 'info', preservando apens 'unlockedTitles'
    -- Se info for null, ele cria o objeto vazio ou só os títulos
    update_str := update_str || 'info = jsonb_build_object(''unlockedTitles'', info->''unlockedTitles''), ';
    
    -- Para cada coluna em public.characters, se não for uma das "intocáveis", resetamos
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'characters'
          AND column_name NOT IN ('id', 'name', 'user_id', 'is_admin', 'created_at', 'info', 'updated_at')
    LOOP
        -- Se for JSONB, resetamos para JSON vazio '{}'::jsonb
        IF col_record.data_type = 'jsonb' THEN
            update_str := update_str || col_record.column_name || ' = ''{}''::jsonb, ';
        -- Se for um numérico, resetamos pra 0 (mas em strings de texto deixamos null ou vazio)
        ELSIF col_record.data_type IN ('integer', 'bigint', 'numeric', 'double precision') THEN
            update_str := update_str || col_record.column_name || ' = 0, ';
        -- Se for boolean, false
        ELSIF col_record.data_type = 'boolean' THEN
            update_str := update_str || col_record.column_name || ' = false, ';
        -- Strings / UUID / Timestamp
        ELSE
            update_str := update_str || col_record.column_name || ' = NULL, ';
        END IF;
    END LOOP;

    -- Recorta as pontas pra query funcionar limpa
    update_str := left(update_str, length(update_str) - 2);
    
    -- Exibimos a query rodada
    RAISE NOTICE 'Executando: %', update_str;

    -- Por fim, executamos!
    EXECUTE update_str;
END $$;
