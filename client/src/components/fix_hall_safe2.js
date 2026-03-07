import fs from 'fs';
const path = 'c:/Users/Administrator/Desktop/Jogo/eternalidle/client/src/components/GuildPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

const hallStart = content.indexOf("{selectedBuilding === 'GUILD_HALL' && (");
const gatheringStart = content.indexOf("{selectedBuilding === 'GATHERING' && (");

if (hallStart !== -1 && gatheringStart !== -1) {
    const hallBlock = 
"                            {selectedBuilding === 'GUILD_HALL' && (\n" +
"                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>\n" +
"                                    <div style={{\n" +
"                                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)',\n" +
"                                        borderRadius: '20px',\n" +
"                                        border: '1px solid rgba(212, 175, 55, 0.2)',\n" +
"                                        padding: isMobile ? '15px' : '20px',\n" +
"                                        position: 'relative',\n" +
"                                        overflow: 'hidden'\n" +
"                                    }}>\n" +
"                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '15px' : '20px' }}>\n" +
"                                            <div>\n" +
"                                                <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>\n" +
"                                                    <Building2 size={isMobile ? 20 : 24} /> GUILD HALL\n" +
"                                                </h3>\n" +
"                                                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '5px 0 0 0' }}>Expand your member slots.</p>\n" +
"                                            </div>\n" +
"                                            <div style={{ textAlign: 'right' }}>\n" +
"                                                <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: 'bold' }}>LVL {guild.guild_hall_level || 0}</div>\n" +
"                                                <div style={{ color: 'var(--accent)', fontSize: '0.6rem', fontWeight: 'bold' }}>MAX LVL 10</div>\n" +
"                                            </div>\n" +
"                                        </div>\n\n" +

"                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '20px' : '25px' }}>\n" +
"                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>\n" +
"                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Current Slots</div>\n" +
"                                                <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>{10 + (guild.guild_hall_level || 0) * 2} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Members</span></div>\n" +
"                                            </div>\n" +
"                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>\n" +
"                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Next Level</div>\n" +
"                                                <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>\n" +
"                                                    {(guild.guild_hall_level || 0) < 10 ? 10 + ((guild.guild_hall_level || 0) + 1) * 2 : 'MAX'}\n" +
"                                                    {(guild.guild_hall_level || 0) < 10 && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}> Slots</span>}\n" +
"                                                </div>\n" +
"                                            </div>\n" +
"                                        </div>\n\n" +

"                                        {(guild.guild_hall_level || 0) < 10 ? (\n" +
"                                            <>\n" +
"                                                <div style={{ marginBottom: '15px' }}>\n" +
"                                                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '10px' }}>UPGRADE REQUIREMENTS</div>\n" +
"                                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>\n" +
"                                                        {/* Silver Cost */}\n" +
"                                                        <div style={{\n" +
"                                                            background: 'rgba(0,0,0,0.3)',\n" +
"                                                            padding: isMobile ? '8px' : '10px',\n" +
"                                                            borderRadius: '10px',\n" +
"                                                            border: '1px solid rgba(255,255,255,0.05)',\n" +
"                                                            display: 'flex',\n" +
"                                                            alignItems: 'center',\n" +
"                                                            gap: isMobile ? '6px' : '10px'\n" +
"                                                        }}>\n" +
"                                                            <Coins size={isMobile ? 14 : 16} color=\"#ffd700\" />\n" +
"                                                            <div>\n" +
"                                                                <div style={{ color: (guild.bank_silver || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost) ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>\n" +
"                                                                    {(GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost).toLocaleString()}\n" +
"                                                                </div>\n" +
"                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Silver (Bank)</div>\n" +
"                                                            </div>\n" +
"                                                        </div>\n\n" +

"                                                        {/* GP Cost */}\n" +
"                                                        <div style={{\n" +
"                                                            background: 'rgba(0,0,0,0.3)',\n" +
"                                                            padding: isMobile ? '8px' : '10px',\n" +
"                                                            borderRadius: '10px',\n" +
"                                                            border: '1px solid rgba(255,255,255,0.05)',\n" +
"                                                            display: 'flex',\n" +
"                                                            alignItems: 'center',\n" +
"                                                            gap: isMobile ? '6px' : '10px'\n" +
"                                                        }}>\n" +
"                                                            <ClipboardList size={isMobile ? 14 : 16} color=\"var(--accent)\" />\n" +
"                                                            <div>\n" +
"                                                                <div style={{ color: (guild.guild_points || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost) ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>\n" +
"                                                                    {(GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost).toLocaleString()}\n" +
"                                                                </div>\n" +
"                                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>GP (Bank)</div>\n" +
"                                                            </div>\n" +
"                                                        </div>\n\n" +

"                                                        {/* Material Costs */}\n" +
"                                                        {(() => {\n" +
"                                                            const tier = Math.min(10, (guild.guild_hall_level || 0) + 1);\n" +
"                                                            return [\n" +
"                                                                { id: `T${tier}_WOOD`, name: `T${tier} Wood`, icon: `/items/T${tier}_WOOD.webp` },\n" +
"                                                                { id: `T${tier}_ORE`, name: `T${tier} Ore`, icon: `/items/T${tier}_ORE.webp` },\n" +
"                                                                { id: `T${tier}_HIDE`, name: `T${tier} Hide`, icon: `/items/T${tier}_HIDE.webp` },\n" +
"                                                                { id: `T${tier}_FIBER`, name: `T${tier} Fiber`, icon: `/items/T${tier}_FIBER.webp` },\n" +
"                                                                { id: `T${tier}_FISH`, name: `T${tier} Fish`, icon: `/items/T${tier}_FISH.webp` },\n" +
"                                                                { id: `T${tier}_HERB`, name: `T${tier} Herb`, icon: `/items/T${tier}_HERB.webp` }\n" +
"                                                            ];\n" +
"                                                        })().map(mat => {\n" +
"                                                            const amount = guild.bank_items?.[mat.id] || 0;\n" +
"                                                            const hasEnough = amount >= 1000;\n\n" +

"                                                            return (\n" +
"                                                                <div key={mat.id} style={{\n" +
"                                                                    background: 'rgba(0,0,0,0.3)',\n" +
"                                                                    padding: isMobile ? '8px' : '10px',\n" +
"                                                                    borderRadius: '10px',\n" +
"                                                                    border: '1px solid rgba(255,255,255,0.05)',\n" +
"                                                                    display: 'flex',\n" +
"                                                                    alignItems: 'center',\n" +
"                                                                    gap: isMobile ? '6px' : '10px'\n" +
"                                                                }}>\n" +
"                                                                    <div style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px', position: 'relative' }}>\n" +
"                                                                        <img src={mat.icon} alt={mat.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />\n" +
"                                                                    </div>\n" +
"                                                                    <div>\n" +
"                                                                        <div style={{ color: hasEnough ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>\n" +
"                                                                            {amount.toLocaleString()} / 1,000\n" +
"                                                                        </div>\n" +
"                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>{mat.name} (Bank)</div>\n" +
"                                                                    </div>\n" +
"                                                                </div>\n" +
"                                                            );\n" +
"                                                        })}\n\n" +

"                                                        {/* Guild Level Requirement */}\n" +
"                                                        {(() => {\n" +
"                                                            const nextLevel = (guild.guild_hall_level || 0) + 1;\n" +
"                                                            const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);\n" +
"                                                            const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;\n\n" +
                                                            
"                                                            return (\n" +
"                                                                <div style={{\n" +
"                                                                    background: 'rgba(0,0,0,0.3)',\n" +
"                                                                    padding: isMobile ? '8px' : '10px',\n" +
"                                                                    borderRadius: '10px',\n" +
"                                                                    border: '1px solid rgba(255,255,255,0.05)',\n" +
"                                                                    display: 'flex',\n" +
"                                                                    alignItems: 'center',\n" +
"                                                                    gap: isMobile ? '6px' : '10px'\n" +
"                                                                }}>\n" +
"                                                                    <Trophy size={isMobile ? 14 : 16} color=\"#4488ff\" />\n" +
"                                                                    <div>\n" +
"                                                                        <div style={{ color: hasGuildLevel ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>\n" +
"                                                                            LVL {reqGuildLevel}\n" +
"                                                                        </div>\n" +
"                                                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Guild Level Req.</div>\n" +
"                                                                    </div>\n" +
"                                                                </div>\n" +
"                                                            );\n" +
"                                                        })()}\n" +
"                                                    </div>\n" +
"                                                </div>\n\n" +

"                                                <motion.button\n" +
"                                                    whileHover={playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 1.02 } : {}}\n" +
"                                                    whileTap={playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 0.98 } : {}}\n" +
"                                                    disabled={!playerHasPermission('manage_upgrades') || (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10)}\n" +
"                                                    onClick={() => { socket?.emit('upgrade_guild_building', { buildingType: 'GUILD_HALL' }); }}\n" +
"                                                    style={{\n" +
"                                                        width: '100%',\n" +
"                                                        padding: '12px',\n" +
"                                                        background: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'var(--accent)' : 'rgba(255,255,255,0.05)',\n" +
"                                                        border: 'none',\n" +
"                                                        borderRadius: '12px',\n" +
"                                                        color: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? '#000' : 'rgba(255,255,255,0.2)',\n" +
"                                                        fontWeight: 'bold',\n" +
"                                                        fontSize: '0.9rem',\n" +
"                                                        cursor: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'pointer' : 'not-allowed',\n" +
"                                                        boxShadow: (guild.myRole === 'LEADER' || guild.myRole === 'OFFICER') ? '0 4px 15px rgba(212, 175, 55, 0.3)' : 'none',\n" +
"                                                        marginTop: '10px'\n" +
"                                                    }}\n" +
"                                                >\n" +
"                                                    {!playerHasPermission('manage_upgrades') ? 'ONLY LEADER/OFFICER' : (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'GUILD LEVEL TOO LOW' : 'UPGRADE TO LVL ' + ((guild.guild_hall_level || 0) + 1)}\n" +
"                                                </motion.button>\n" +
"                                            </>\n" +
"                                        ) : (\n" +
"                                            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '12px', border: '1px solid var(--accent)' }}>\n" +
"                                                <Sparkles size={32} color=\"var(--accent)\" style={{ marginBottom: '10px' }} />\n" +
"                                                <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.9rem' }}>MAXIMUM LEVEL REACHED</div>\n" +
"                                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>Your Guild Hall is at its peak power!</div>\n" +
"                                            </div>\n" +
"                                        )}\n" +
"                                    </div>\n" +
"                                </div>\n" +
"                            );\n";

    const pre = content.substring(0, hallStart);
    const post = content.substring(gatheringStart);
    content = pre + hallBlock + "\n                            " + post;
    console.log("Fixed GUILD_HALL block");
} else {
    console.log("Could not find start/end markers");
}

fs.writeFileSync(path, content);
console.log("Success!");
