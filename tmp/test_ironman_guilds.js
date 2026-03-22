// Script de teste simplificado para verificar restrições de Ironman em guildas
import { GuildManager } from '../server/managers/GuildManager.js';

// Mock do Supabase
const mockSupabase = {
    from: (table) => ({
        select: (query) => ({
            eq: (col, val) => ({
                maybeSingle: async () => {
                    if (table === 'guilds') {
                        if (val === 'guild_ironman') return { data: { id: 'guild_ironman', is_ironman: true, join_mode: 'OPEN', min_level: 1 }, error: null };
                        if (val === 'guild_normal') return { data: { id: 'guild_normal', is_ironman: false, join_mode: 'OPEN', min_level: 1 }, error: null };
                    }
                    if (table === 'guild_members') return { data: null, error: null };
                    return { data: null, error: null };
                },
                single: async () => {
                    if (table === 'guilds') {
                        if (val === 'guild_ironman') return { data: { id: 'guild_ironman', is_ironman: true, join_mode: 'OPEN', min_level: 1 }, error: null };
                        if (val === 'guild_normal') return { data: { id: 'guild_normal', is_ironman: false, join_mode: 'OPEN', min_level: 1 }, error: null };
                    }
                    return { data: null, error: null };
                }
            })
        }),
        insert: (data) => ({
            select: () => ({
                single: async () => ({ data: { id: 'new_guild' }, error: null })
            })
        })
    })
};

const mockGameManager = {
    supabase: mockSupabase,
    saveStateCritical: async () => {},
    markDirty: () => {},
    persistCharacter: async () => {},
    cache: new Map(),
    getStatus: async () => ({})
};

const guildManager = new GuildManager(mockGameManager);

async function runTests() {
    console.log("Iniciando testes de Guilda Ironman...\n");

    const charIronman = { id: 'char_ironman', name: 'IronmanPlayer', state: { isIronman: true, silver: 1000000 }, skills: { combat: { level: 10 } } };
    const charNormal = { id: 'char_normal', name: 'NormalPlayer', state: { isIronman: false, silver: 1000000 }, skills: { combat: { level: 10 } } };

    // Teste 1: Ironman tentando entrar em guilda normal
    try {
        console.log("Teste 1: Ironman tentando entrar em guilda normal...");
        await guildManager.applyToGuild(charIronman, 'guild_normal');
        console.error("ERRO: Ironman conseguiu entrar em guilda normal!\n");
    } catch (e) {
        console.log("SUCESSO: Bloqueado corretamente ->", e.message, "\n");
    }

    // Teste 2: Personagem comum tentando entrar em guilda Ironman
    try {
        console.log("Teste 2: Personagem comum tentando entrar em guilda Ironman...");
        await guildManager.applyToGuild(charNormal, 'guild_ironman');
        console.error("ERRO: Personagem comum conseguiu entrar em guilda Ironman!\n");
    } catch (e) {
        console.log("SUCESSO: Bloqueado corretamente ->", e.message, "\n");
    }

    // Teste 3: Ironman tentando entrar em guilda Ironman
    try {
        console.log("Teste 3: Ironman tentando entrar em guilda Ironman...");
        const result = await guildManager.applyToGuild(charIronman, 'guild_ironman');
        if (result.joined) {
            console.log("SUCESSO: Ironman entrou na guilda Ironman.\n");
        } else {
            console.error("ERRO: Ironman falhou ao entrar em guilda Ironman.\n");
        }
    } catch (e) {
        console.error("ERRO: Exceção inesperada ->", e.message, "\n");
    }

    // Teste 4: Personagem comum tentando entrar em guilda normal
    try {
        console.log("Teste 4: Personagem comum tentando entrar em guilda normal...");
        const result = await guildManager.applyToGuild(charNormal, 'guild_normal');
        if (result.joined) {
            console.log("SUCESSO: Personagem comum entrou na guilda normal.\n");
        } else {
            console.error("ERRO: Personagem comum falhou ao entrar em guilda normal.\n");
        }
    } catch (e) {
        console.error("ERRO: Exceção inesperada ->", e.message, "\n");
    }

    console.log("Testes concluídos.");
}

runTests().catch(console.error);
