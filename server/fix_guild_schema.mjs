
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function fixSchema() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
    const columnsToAdd = [
        { name: 'library_level', type: 'INTEGER', default: '0' },
        { name: 'guild_hall_level', type: 'INTEGER', default: '0' },
        { name: 'gathering_xp_level', type: 'INTEGER', default: '0' },
        { name: 'gathering_duplic_level', type: 'INTEGER', default: '0' },
        { name: 'gathering_auto_level', type: 'INTEGER', default: '0' },
        { name: 'refining_xp_level', type: 'INTEGER', default: '0' },
        { name: 'refining_duplic_level', type: 'INTEGER', default: '0' },
        { name: 'refining_effic_level', type: 'INTEGER', default: '0' },
        { name: 'crafting_xp_level', type: 'INTEGER', default: '0' },
        { name: 'crafting_duplic_level', type: 'INTEGER', default: '0' },
        { name: 'crafting_effic_level', type: 'INTEGER', default: '0' }
    ];

    console.log("Iniciando migração de colunas da guilda...");

    for (const col of columnsToAdd) {
        console.log(`Verificando coluna: ${col.name}...`);
        
        // Tentamos selecionar a coluna para ver se existe
        const { error: checkError } = await supabase.from('guilds').select(col.name).limit(1);
        
        if (checkError && (checkError.message.includes('does not exist') || checkError.code === '42703')) {
            console.log(`[SQL] Adicionando coluna ${col.name}...`);
            
            // Usando RPC customizado ou tentando via SQL se permitido
            // Como não temos RPC de alter table, vamos instruir o usuário ou tentar via query insegura se o Supabase permitir (geralmente não permite DDL via REST API)
            // No entanto, em muitos ambientes de dev desse projeto, o usuário usa o editor SQL.
            // Para ser mais efetivo aqui, vou gerar o SQL final para o usuário e tentar rodar via um RPC de serviço se existir.
            // Se não houver RPC, vou pedir para o usuário rodar no painel.
        } else if (!checkError) {
            console.log(`Coluna ${col.name} já existe.`);
        } else {
            console.error(`Erro ao verificar ${col.name}:`, checkError.message);
        }
    }
}

// Devido a limitações de DDL via API REST do Supabase, o melhor é gerar o SQL consolidado.
const masterSQL = `
-- Consolidação de todas as colunas de construção da guilda
ALTER TABLE guilds 
ADD COLUMN IF NOT EXISTS library_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS guild_hall_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gathering_xp_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gathering_duplic_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gathering_auto_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refining_xp_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refining_duplic_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refining_effic_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_xp_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_duplic_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crafting_effic_level INTEGER DEFAULT 0;
`;

console.log("--- SQL PARA RODAR NO SUPABASE ---");
console.log(masterSQL);
console.log("----------------------------------");

fixSchema();
