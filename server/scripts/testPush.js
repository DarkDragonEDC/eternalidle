import webpush from 'web-push';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendTestPush(userId, message) {
    console.log(`[TEST-PUSH] Encontrando inscrições para o usuário: ${userId}`);

    const { data: subs, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[TEST-PUSH] Erro ao buscar inscrições:', error);
        return;
    }

    if (!subs || subs.length === 0) {
        console.log('[TEST-PUSH] Nenhuma inscrição de push encontrada para este usuário.');
        return;
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.error('[TEST-PUSH] FALHA: Chaves VAPID faltando no .env!');
        return;
    }

    webpush.setVapidDetails(
        'mailto:admin@eternalidle.com',
        publicKey,
        privateKey
    );

    const payload = JSON.stringify({
        title: 'Teste de Notificação',
        body: message || 'Esta é uma notificação de teste do Eternal Idle!',
        icon: '/logo192.png',
        data: {
            url: '/'
        }
    });

    console.log(`[TEST-PUSH] Enviando para ${subs.length} dispositivos...`);

    for (const sub of subs) {
        try {
            const pushSub = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };
            await webpush.sendNotification(pushSub, payload);
            console.log(`[TEST-PUSH] Enviado com sucesso para: ${sub.endpoint}`);
        } catch (err) {
            console.error(`[TEST-PUSH] Erro ao enviar para ${sub.endpoint}:`, err);
            if (err.statusCode === 410) {
                console.log('[TEST-PUSH] Inscrição expirada, removendo do banco...');
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
        }
    }
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Uso: node scripts/testPush.js <user_id> [mensagem]');
    process.exit(1);
}

sendTestPush(args[0], args[1]);
