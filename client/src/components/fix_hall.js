import fs from 'fs';
const path = 'c:/Users/Administrator/Desktop/Jogo/eternalidle/client/src/components/GuildPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix GUILD_HALL
const hallStart = content.indexOf('{/* GUILD_HALL Section */}');
const gatheringStart = content.indexOf('{/* GATHERING_STATION Section */}');

if (hallStart !== -1 && gatheringStart !== -1) {
    const hallBlock = \`
                            {selectedBuilding === 'GUILD_HALL' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '10px', borderRadius: '15px' }}>
                                            <Building2 size={30} color="var(--accent)" />
                                        </div>
                                        <div>
                                            <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem' }}>GUILD HALL</h3>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: 'bold' }}>LVL {guild.guild_hall_level || 0}</div>
                                            <div style={{ color: 'var(--accent)', fontSize: '0.6rem', fontWeight: 'bold' }}>MAX LVL 10</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: isMobile ? '10px' : '15px', marginBottom: isMobile ? '20px' : '25px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Current Slots</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>{10 + (guild.guild_hall_level || 0) * 2} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Members</span></div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: isMobile ? '10px' : '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginBottom: '5px', textTransform: 'uppercase' }}>Next Level</div>
                                            <div style={{ color: '#fff', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 'bold' }}>
                                                {(guild.guild_hall_level || 0) < 10 ? 10 + ((guild.guild_hall_level || 0) + 1) * 2 : 'MAX'}
                                                {(guild.guild_hall_level || 0) < 10 && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}> Slots</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {(guild.guild_hall_level || 0) < 10 ? (
                                        <>
                                            <div style={{ marginBottom: '15px' }}>
                                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '10px' }}>UPGRADE REQUIREMENTS</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                                                    {/* Silver Cost */}
                                                    <div style={{
                                                        background: 'rgba(0,0,0,0.3)',
                                                        padding: isMobile ? '8px' : '10px',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: isMobile ? '6px' : '10px'
                                                    }}>
                                                        <Coins size={isMobile ? 14 : 16} color="#ffd700" />
                                                        <div>
                                                            <div style={{ color: (guild.bank_silver || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost) ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>
                                                                {(GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost).toLocaleString()}
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Silver (Bank)</div>
                                                        </div>
                                                    </div>

                                                    {/* GP Cost */}
                                                    <div style={{
                                                        background: 'rgba(0,0,0,0.3)',
                                                        padding: isMobile ? '8px' : '10px',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: isMobile ? '6px' : '10px'
                                                    }}>
                                                        <ClipboardList size={isMobile ? 14 : 16} color="var(--accent)" />
                                                        <div>
                                                            <div style={{ color: (guild.guild_points || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost) ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>
                                                                {(GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost).toLocaleString()}
                                                            </div>
                                                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>GP (Bank)</div>
                                                        </div>
                                                    </div>

                                                    {/* Material Costs */}
                                                    {(() => {
                                                        const tier = Math.min(10, (guild.guild_hall_level || 0) + 1);
                                                        return [
                                                            { id: \\\`T\${tier}_WOOD\\\`, name: \\\`T\${tier} Wood\\\`, icon: \\\`/items/T\${tier}_WOOD.webp\\\` },
                                                            { id: \\\`T\${tier}_ORE\\\`, name: \\\`T\${tier} Ore\\\`, icon: \\\`/items/T\${tier}_ORE.webp\\\` },
                                                            { id: \\\`T\${tier}_HIDE\\\`, name: \\\`T\${tier} Hide\\\`, icon: \\\`/items/T\${tier}_HIDE.webp\\\` },
                                                            { id: \\\`T\${tier}_FIBER\\\`, name: \\\`T\${tier} Fiber\\\`, icon: \\\`/items/T\${tier}_FIBER.webp\\\` },
                                                            { id: \\\`T\${tier}_FISH\\\`, name: \\\`T\${tier} Fish\\\`, icon: \\\`/items/T\${tier}_FISH.webp\\\` },
                                                            { id: \\\`T\${tier}_HERB\\\`, name: \\\`T\${tier} Herb\\\`, icon: \\\`/items/T\${tier}_HERB.webp\\\` }
                                                        ];
                                                    })().map(mat => {
                                                        const amount = guild.bank_items?.[mat.id] || 0;
                                                        const hasEnough = amount >= 1000;

                                                        return (
                                                            <div key={mat.id} style={{
                                                                background: 'rgba(0,0,0,0.3)',
                                                                padding: isMobile ? '8px' : '10px',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: isMobile ? '6px' : '10px'
                                                            }}>
                                                                <div style={{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px', position: 'relative' }}>
                                                                    <img src={mat.icon} alt={mat.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                </div>
                                                                <div>
                                                                    <div style={{ color: hasEnough ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>
                                                                        {amount.toLocaleString()} / 1,000
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>{mat.name} (Bank)</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Guild Level Requirement */}
                                                    {(() => {
                                                        const nextLevel = (guild.guild_hall_level || 0) + 1;
                                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
                                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;

                                                        return (
                                                            <div style={{
                                                                background: 'rgba(0,0,0,0.3)',
                                                                padding: isMobile ? '8px' : '10px',
                                                                borderRadius: '10px',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: isMobile ? '6px' : '10px'
                                                            }}>
                                                                <Trophy size={isMobile ? 14 : 16} color="#4488ff" />
                                                                <div>
                                                                    <div style={{ color: hasGuildLevel ? '#44ff44' : '#ff4444', fontSize: isMobile ? '0.7rem' : '0.75rem', fontWeight: 'bold' }}>
                                                                        LVL {reqGuildLevel}
                                                                    </div>
                                                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem' }}>Guild Level Req.</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <motion.button
                                                whileHover={playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 1.02 } : {}}
                                                whileTap={playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 0.98 } : {}}
                                                disabled={
                                                    !playerHasPermission('manage_upgrades') ||
                                                    (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10)
                                                }
                                                onClick={() => {
                                                    socket?.emit('upgrade_guild_building', { buildingType: 'GUILD_HALL' });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    color: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? '#000' : 'rgba(255,255,255,0.2)',
                                                    fontWeight: 'bold',
                                                    cursor: playerHasPermission('manage_upgrades') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'pointer' : 'not-allowed',
                                                    marginTop: '10px'
                                                }}
                                            >
                                                {!playerHasPermission('manage_upgrades') ? 'NO PERMISSION' : (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? 'GUILD LEVEL TOO LOW' : 'UPGRADE GUILD HALL'}
                                            </motion.button>
                                        </>
                                    ) : (
                                        <div style={{ background: 'rgba(68, 255, 68, 0.05)', border: '1px solid rgba(68, 255, 68, 0.2)', borderRadius: '15px', padding: '20px', textAlign: 'center' }}>
                                            <Check size={24} color="#44ff44" style={{ margin: '0 auto 10px' }} />
                                            <div style={{ color: '#44ff44', fontSize: '1rem', fontWeight: 'bold' }}>MAX LEVEL REACHED</div>
                                            <p style={{ color: 'rgba(68, 255, 68, 0.6)', fontSize: '0.75rem', margin: '5px 0 0 0' }}>Your guild hall is at its maximum capacity.</p>
                                        </div>
                                    )}
                                </div>
                            )}

\`;
    const pre = content.substring(0, hallStart);
    const post = content.substring(gatheringStart);
    content = pre + hallBlock + post;
    console.log("Fixed GUILD_HALL block");
}

fs.writeFileSync(path, content);
console.log("Success!");
