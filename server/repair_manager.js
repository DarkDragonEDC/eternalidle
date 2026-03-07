import fs from 'fs';
const content = fs.readFileSync('GameManager.js', 'utf8');
// Find the last "async getCharacter" and keep everything before it, then append a clean version
// Actually, let's just find the last "return data;" and cut there.
const lastReturnDataIndex = content.lastIndexOf('return data;');
if (lastReturnDataIndex === -1) {
    console.error("Could not find 'return data;'");
    process.exit(1);
}

// Cut at the closing brace after the return data
const searchPart = content.substring(lastReturnDataIndex);
const closingBraceIndex = searchPart.indexOf('}') + lastReturnDataIndex;

const cleanStart = content.substring(0, closingBraceIndex + 1);
const tail = `

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

fs.writeFileSync('GameManager.js', cleanStart + tail);
console.log("GameManager.js repaired successfully.");
