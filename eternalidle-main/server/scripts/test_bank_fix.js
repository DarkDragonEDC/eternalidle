
// Mock do GameManager e da lógica de banco para validar a correção
async function testBankFix() {
    console.log("Variando correção do banco...");

    const mockChar = {
        id: 'test-char',
        state: {
            bank: {}, // Simula o estado problemático do Supabase (objeto sem .items)
            inventory: {
                'TEST_ITEM': { amount: 10 }
            }
        }
    };

    const itemId = 'TEST_ITEM';
    const quantity = 5;

    try {
        // Lógica extraída do index.js corrigido
        if (!mockChar.state.bank) mockChar.state.bank = { items: {}, slots: 10 };
        const bank = mockChar.state.bank;
        
        // --- A CORREÇÃO ---
        if (!bank.items) bank.items = {}; 
        
        const inv = mockChar.state.inventory;
        const entry = inv[itemId];
        const availableQty = typeof entry === 'object' ? (entry.amount || 0) : (Number(entry) || 0);
        const qty = Math.min(quantity, availableQty);

        // Check bank slots (onde ocorria o erro)
        const usedBankSlots = Object.keys(bank.items || {}).filter(k => {
            const e = bank.items[k];
            return typeof e === 'object' ? (e.amount || 0) > 0 : (Number(e) || 0) > 0;
        }).length;

        console.log(`Sucesso! Slots usados: ${usedBankSlots}`);
        console.log("Estado do banco após inicialização:", JSON.stringify(mockChar.state.bank));

        if (mockChar.state.bank.items) {
            console.log("TESTE PASSOU: bank.items foi inicializado corretamente.");
        } else {
            console.error("TESTE FALHOU: bank.items não foi inicializado.");
        }

    } catch (err) {
        console.error("ERRO DURANTE O TESTE:", err);
    }
}

testBankFix();
