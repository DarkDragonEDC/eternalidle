const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rozwhqxbpsxlxbkfzvce.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvendocXhicHN4bHhia2Z6dmNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTcyMjQxMCwiZXhwIjoyMDg1Mjk4NDEwfQ.xLoD96rYvto8JnrhvTxJfwmTxLHANcnbQQyrIc5gJ2I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixGuild() {
    const GUILD_NAME = 'Eternal Idlers';

    console.log(`Buscando guilda: ${GUILD_NAME}...`);
    const { data: guild, error: guildError } = await supabase
        .from('guilds')
        .select('id, leader_id')
        .ilike('name', GUILD_NAME)
        .single();

    if (guildError || !guild) {
        console.error('Erro ao buscar guilda:', guildError?.message || 'Não encontrada');
        return;
    }

    console.log(`Guilda encontrada: ${guild.id}`);

    // 1. Verificar quem é o membro mais antigo para ser o líder
    const { data: members, error: membersError } = await supabase
        .from('guild_members')
        .select('character_id, role, joined_at')
        .eq('guild_id', guild.id)
        .order('joined_at', { ascending: true });

    if (membersError || !members || members.length === 0) {
        console.error('Erro ao buscar membros:', membersError?.message || 'Nenhum membro');
        return;
    }

    const oldestMember = members[0];
    console.log(`Membro mais antigo (Líder provável): ${oldestMember.character_id}`);

    // 2. Atualizar leader_id na tabela guilds
    console.log('Atualizando leader_id na tabela guilds...');
    const { error: updateGuildError } = await supabase
        .from('guilds')
        .update({ leader_id: oldestMember.character_id })
        .eq('id', guild.id);

    if (updateGuildError) {
        console.error('Erro ao atualizar leader_id:', updateGuildError.message);
    } else {
        console.log('leader_id atualizado com sucesso!');
    }

    // 3. Atualizar role para LEADER na tabela guild_members
    console.log(`Atualizando cargo do personagem ${oldestMember.character_id} para LEADER...`);
    const { error: updateMemberError } = await supabase
        .from('guild_members')
        .update({ role: 'LEADER' })
        .eq('character_id', oldestMember.character_id)
        .eq('guild_id', guild.id);

    if (updateMemberError) {
        console.error('Erro ao atualizar cargo:', updateMemberError.message);
    } else {
        console.log('Cargo de LEADER atribuído com sucesso!');
    }

    console.log('Processo de reparo concluído.');
}

fixGuild().catch(console.error);
