import fs from 'fs';
const content = fs.readFileSync('GameManager.js', 'utf8');
const lines = content.split('\n');

// Vamos pegar apenas até a linha 3500, que sabemos que está íntegra
const cleanLines = lines.slice(0, 3500);
const cleanBase = cleanLines.join('\n');

// Agora adicionamos o final correto e limpo
const finalTouch = `
    }

    async getGuildBonuses(guildId) {
        if (!guildId) return null;

        const now = Date.now();
        const cached = this.guildBonusesCache.get(guildId);
        
        // Use cache for 5 minutes
        if (cached && (now - cached.timestamp < 300000)) {
            return cached.bonuses;
        }

        try {
            const { data, error } = await this.supabase
                .from('guilds')
                .select('gathering_xp_level, gathering_duplic_level, gathering_auto_level')
                .eq('id', guildId)
                .maybeSingle();

            if (error || !data) return null;

            const bonuses = {
                gathering_xp: (data.gathering_xp_level || 0) * 1, // 1% per level
                gathering_duplic: (data.gathering_duplic_level || 0) * 1,
                gathering_auto: (data.gathering_auto_level || 0) * 1
            };

            this.guildBonusesCache.set(guildId, {
                bonuses,
                timestamp: now
            });

            return bonuses;
        } catch (err) {
            console.error(\`[GUILD-BONUS] Error fetching for \${guildId}:\`, err);
            return null;
        }
    }
}
`;

fs.writeFileSync('GameManager.js', cleanBase + finalTouch);
console.log("GameManager.js reconstruído com sucesso.");
