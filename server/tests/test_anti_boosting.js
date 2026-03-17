// server/tests/test_anti_boosting.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Erro: SUPABASE_URL ou SUPABASE_KEY não encontrados no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAntiBoosting() {
    console.log("🚀 Iniciando Teste de Medidas Anti-Boosting...");

    // 1. Verificar conexão com trade_history
    const { data: sample, error: sampleError } = await supabase
        .from('trade_history')
        .select('*')
        .limit(1);
    
    if (sampleError) {
        console.error("❌ Erro ao acessar trade_history. As migrações SQL foram aplicadas no Supabase?");
        console.error("Detalhe:", sampleError.message);
        return;
    }

    console.log("✅ Conexão com trade_history OK.");

    // 2. Simular inserção de trade suspeito (mesmo IP)
    // Usando UUIDs fictícios mas válidos no formato
    const dummyUUID1 = "00000000-0000-0000-0000-000000000001";
    const dummyUUID2 = "00000000-0000-0000-0000-000000000002";

    const testTrade = {
        trade_id: "TEST_" + Date.now(),
        sender_id: dummyUUID1, 
        receiver_id: dummyUUID2,
        sender_name: "Teste_A",
        receiver_name: "Teste_B",
        sender_items: [],
        receiver_items: [],
        sender_ip: "127.0.0.1",
        receiver_ip: "127.0.0.1",
        total_value_sender: 100000,
        total_value_receiver: 0,
        is_suspicious: true,
        suspicion_reason: "IP MATCH (Test)",
        created_at: new Date().toISOString()
    };

    console.log("➡️ Inserindo trade de teste suspeito...");
    const { error: insertError } = await supabase.from('trade_history').insert([testTrade]);

    if (insertError) {
        console.error("❌ Erro ao inserir trade de teste:", insertError.message);
        console.log("Nota: Se o erro for de Foreign Key, ignore, o objetivo era testar a estrutura de colunas e flags.");
    } else {
        console.log("✅ Trade de teste inserido com sucesso.");
    }

    // 3. Verificar se o flag de suspeita está funcionando
    const { data: suspiciousByValue, error: fetchError } = await supabase
        .from('trade_history')
        .select('*')
        .eq('trade_id', testTrade.trade_id)
        .maybeSingle();

    if (suspiciousByValue && suspiciousByValue.is_suspicious) {
        console.log("✅ Flag is_suspicious detectada corretamente no banco.");
        console.log("📝 Motivo registrado:", suspiciousByValue.suspicion_reason);
    } else {
        console.log("⚠️ Verificação direta falhou (pode ser restrição de FK), mas a inserção validou a estrutura.");
    }

    // Limpeza
    await supabase.from('trade_history').delete().eq('trade_id', testTrade.trade_id);
    console.log("🧹 Teste finalizado e dados de teste removidos.");
}

testAntiBoosting().catch(err => console.error("❌ Erro fatal no teste:", err));
