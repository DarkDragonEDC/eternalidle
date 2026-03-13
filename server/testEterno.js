import { supabase } from './services/supabase.js';
import { PushManager } from './managers/PushManager.js';

async function testEterno() {
    console.log('[TEST-ETERNO] Buscando personagem Eterno...');
    
    const { data: char, error } = await supabase
        .from('characters')
        .select('user_id, name')
        .ilike('name', 'Eterno')
        .maybeSingle();

    if (error) {
        console.error('[TEST-ETERNO] Erro ao buscar:', error.message);
        return;
    }

    if (!char) {
        console.log('[TEST-ETERNO] Personagem "Eterno" não encontrado.');
        return;
    }

    console.log(`[TEST-ETERNO] Encontrado! User ID: ${char.user_id}`);
    
    // Simular o PushManager
    const gm = { supabase }; // Mock do GameManager
    const pushManager = new PushManager(gm);
    
    console.log('[TEST-ETERNO] Enviando notificação de teste...');
    const results = await pushManager.notifyUser(
        char.user_id, 
        'push_test', 
        'Teste do Eternal Idle 🐉', 
        'Olá Eterno! Este é um teste oficial de notificação push.',
        '/'
    );

    if (results && results.length > 0) {
        console.log('[TEST-ETERNO] Resultado:', JSON.stringify(results));
    } else {
        console.log('[TEST-ETERNO] Nenhuma inscrição de push ativa para este usuário.');
    }
}

testEterno();
