import fs from 'fs';
let content = fs.readFileSync('GuildPanel.jsx', 'utf8');

const gatheringStart = content.indexOf("{selectedBuilding === 'GATHERING' && (");
const bankStart = content.indexOf("{selectedBuilding === 'BANK' && (");

if (gatheringStart === -1 || bankStart === -1) {
    console.log("Locators not found. G:" + gatheringStart + " B:" + bankStart);
    process.exit(1);
}

const cleanCode = `                            {selectedBuilding === 'GATHERING' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(0,0,0,0) 100%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(168, 85, 247, 0.2)',
                                        padding: isMobile ? '15px' : '20px'
                                    }}>
                                        <h3 style={{ color: '#a855f7', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Pickaxe size={isMobile ? 20 : 24} /> GATHERING STATION
                                        </h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '5px 0 0 0' }}>Expand your guild's collective gathering efficiency.</p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                                        {['XP', 'DUPLIC', 'AUTO'].map(path => {
                                            const config = GUILD_BUILDINGS.GATHERING_STATION.paths[path];
                                            const currentLevel = guild[config.column] || 0;
                                            const nextLevel = currentLevel + 1;
                                            const isMax = currentLevel >= GUILD_BUILDINGS.GATHERING_STATION.maxLevel;
                                            
                                            const silverCost = GUILD_BUILDINGS.GATHERING_STATION.baseSilverCost + (currentLevel * GUILD_BUILDINGS.GATHERING_STATION.perLevelSilverCost);
                                            const matAmount = GUILD_BUILDINGS.GATHERING_STATION.baseMaterialCost;
                                            const tier = Math.min(10, currentLevel + 1);
                                            const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
                                            const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                            const isSyncBlocked = Object.values(GUILD_BUILDINGS.GATHERING_STATION.paths).some(p => (guild[p.column] || 0) < currentLevel);
                                            const hasMats = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].every(m => (guild.bank_items?.[\\\`T\${tier}_\${m}\\\`] || 0) >= matAmount);
                                            const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                            const canUpgrade = playerHasPermission('manage_upgrades') && hasGuildLevel && hasSilver && hasMats && !isSyncBlocked;

                                            const color = path === 'XP' ? '#4488ff' : path === 'DUPLIC' ? '#ffd700' : '#a855f7';
                                            const Icon = path === 'XP' ? Trophy : path === 'DUPLIC' ? Sparkles : Zap;

                                            return (
                                                <div key={path} style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    padding: '15px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    opacity: isSyncBlocked ? 0.6 : 1,
                                                    transition: 'opacity 0.3s ease'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ background: \\\`\\\${color}22\\\`, padding: '6px', borderRadius: '8px' }}>
                                                            <Icon size={18} color={color} />
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>LVL {currentLevel}</div>
                                                    </div>

                                                    <div>
                                                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{config.name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Current: <span style={{ color }}>+{currentLevel * config.bonusPerLevel}{config.suffix}</span></div>
                                                    </div>

                                                    {!isMax ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                                                            {isSyncBlocked ? (
                                                                <div style={{ 
                                                                    background: 'rgba(255, 68, 68, 0.05)', 
                                                                    border: '1px solid rgba(255, 68, 68, 0.1)',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    <Lock size={14} color="#ff4444" />
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.65rem', color: '#ff4444', fontWeight: 'bold', letterSpacing: '0.5px' }}>SYNC REQUIRED</span>
                                                                        <span style={{ fontSize: '0.55rem', color: 'rgba(255, 68, 68, 0.7)', fontWeight: 'medium' }}>All paths must reach Lv {currentLevel}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Upgrade To Lv {nextLevel}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                                                <Coins size={12} color="#ffd700" />
                                                                <span style={{ fontSize: '0.7rem', color: hasSilver ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{silverCost.toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                                                <Trophy size={12} color="#4488ff" />
                                                                <span style={{ fontSize: '0.7rem', color: hasGuildLevel ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>Guild Lv {reqGuildLevel}</span>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '5px' }}>
                                                                {['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => {
                                                                    const matId = \\\`T\\\${tier}_\\\${m}\\\`;
                                                                    const currentMat = guild.bank_items?.[matId] || 0;
                                                                    const hasMat = currentMat >= matAmount;
                                                                    return (
                                                                        <div key={m} title={\\\`T\\\${tier} \\\${m}: \\\${currentMat}/\\\${matAmount}\\\`} style={{
                                                                            background: 'rgba(0,0,0,0.2)',
                                                                            padding: '4px',
                                                                            borderRadius: '6px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            border: \\\`1px solid \\\${hasMat ? 'rgba(68, 255, 68, 0.1)' : 'rgba(255, 68, 68, 0.1)'}\\\`
                                                                        }}>
                                                                            <img src={\\\`/items/\\\${matId}.webp\\\`} alt={m} style={{ width: '14px', height: '14px', marginBottom: '2px' }} />
                                                                            <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', textTransform: 'uppercase' }}>T{tier} {m}</div>
                                                                            <div style={{ fontSize: '0.5rem', color: hasMat ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>
                                                                                {currentMat >= 1000 ? (currentMat / 1000).toFixed(1) + 'K' : currentMat} / {matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                disabled={!canUpgrade}
                                                                onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'GATHERING_STATION', path })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    background: canUpgrade ? color : 'rgba(255,255,255,0.05)',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.7rem',
                                                                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                                                                    marginTop: '5px'
                                                                }}
                                                            >
                                                                {isMax ? 'MAX LEVEL' : isSyncBlocked ? 'LOCKED BY SYNC' : canUpgrade ? 'UPGRADE' : 'MISSING REQUIREMENTS'}
                                                            </motion.button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ background: 'rgba(68, 255, 68, 0.05)', border: '1px solid rgba(68, 255, 68, 0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center', marginTop: '10px' }}>
                                                            <Check size={16} color="#44ff44" style={{ margin: '0 auto 4px' }} />
                                                            <div style={{ color: '#44ff44', fontSize: '0.65rem', fontWeight: 'bold' }}>MAX LEVEL</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontStyle: 'italic' }}>
                                        * Upgrades consume Silver and {GUILD_BUILDINGS.GATHERING_STATION.baseMaterialCost.toLocaleString()} of each T(Lv) material from the Guild Bank.
                                    </div>
                                </div>
                            )}

                            {selectedBuilding === 'REFINING' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(0,0,0,0) 100%)',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        padding: isMobile ? '15px' : '20px'
                                    }}>
                                        <h3 style={{ color: '#10b981', margin: 0, fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FlaskConical size={isMobile ? 20 : 24} /> REFINING STATION
                                        </h3>
                                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '5px 0 0 0' }}>Expand your guild's collective refining efficiency.</p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                                        {['XP', 'DUPLIC', 'EFFICIENCY'].map(path => {
                                            const config = GUILD_BUILDINGS.REFINING_STATION.paths[path];
                                            const currentLevel = guild[config.column] || 0;
                                            const nextLevel = currentLevel + 1;
                                            const isMax = currentLevel >= GUILD_BUILDINGS.REFINING_STATION.maxLevel;
                                            
                                            const silverCost = GUILD_BUILDINGS.REFINING_STATION.baseSilverCost + (currentLevel * GUILD_BUILDINGS.REFINING_STATION.perLevelSilverCost);
                                            const matAmount = GUILD_BUILDINGS.REFINING_STATION.baseMaterialCost;
                                            const tier = Math.min(10, currentLevel + 1);
                                            const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);
                                            const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;
                                            const isSyncBlocked = Object.values(GUILD_BUILDINGS.REFINING_STATION.paths).some(p => (guild[p.column] || 0) < currentLevel);
                                            const hasMats = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].every(m => (guild.bank_items?.[\\\`T\${tier}_\${m}\\\`] || 0) >= matAmount);
                                            const hasSilver = (guild.bank_silver || 0) >= silverCost;
                                            const canUpgrade = playerHasPermission('manage_upgrades') && hasGuildLevel && hasSilver && hasMats && !isSyncBlocked;

                                            const color = path === 'XP' ? '#4488ff' : path === 'DUPLIC' ? '#ffd700' : '#10b981';
                                            const Icon = path === 'XP' ? Trophy : path === 'DUPLIC' ? Sparkles : Zap;

                                            return (
                                                <div key={path} style={{
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: '16px',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    padding: '15px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    opacity: isSyncBlocked ? 0.6 : 1,
                                                    transition: 'opacity 0.3s ease'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ background: \\\`\\\${color}22\\\`, padding: '6px', borderRadius: '8px' }}>
                                                            <Icon size={18} color={color} />
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff' }}>LVL {currentLevel}</div>
                                                    </div>

                                                    <div>
                                                        <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>{config.name}</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>Current: <span style={{ color }}>+{currentLevel * config.bonusPerLevel}{config.suffix}</span></div>
                                                    </div>

                                                    {!isMax ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px' }}>
                                                            {isSyncBlocked ? (
                                                                <div style={{ 
                                                                    background: 'rgba(255, 68, 68, 0.05)', 
                                                                    border: '1px solid rgba(255, 68, 68, 0.1)',
                                                                    borderRadius: '8px',
                                                                    padding: '8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px',
                                                                    marginBottom: '4px'
                                                                }}>
                                                                    <Lock size={14} color="#ff4444" />
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.65rem', color: '#ff4444', fontWeight: 'bold', letterSpacing: '0.5px' }}>SYNC REQUIRED</span>
                                                                        <span style={{ fontSize: '0.55rem', color: 'rgba(255, 68, 68, 0.7)', fontWeight: 'medium' }}>All paths must reach Lv {currentLevel}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                                    Upgrade To Lv {nextLevel}
                                                                </div>
                                                            )}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                                                <Coins size={12} color="#ffd700" />
                                                                <span style={{ fontSize: '0.7rem', color: hasSilver ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>{silverCost.toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '8px' }}>
                                                                <Trophy size={12} color="#4488ff" />
                                                                <span style={{ fontSize: '0.7rem', color: hasGuildLevel ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>Guild Lv {reqGuildLevel}</span>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginTop: '5px' }}>
                                                                {['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'].map(m => {
                                                                    const matId = \\\`T\\\${tier}_\\\${m}\\\`;
                                                                    const currentMat = guild.bank_items?.[matId] || 0;
                                                                    const hasMat = currentMat >= matAmount;
                                                                    return (
                                                                        <div key={m} title={\\\`T\\\${tier} \\\${m}: \\\${currentMat}/\\\${matAmount}\\\`} style={{
                                                                            background: 'rgba(0,0,0,0.2)',
                                                                            padding: '4px',
                                                                            borderRadius: '6px',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            border: \\\`1px solid \\\${hasMat ? 'rgba(68, 255, 68, 0.1)' : 'rgba(255, 68, 68, 0.1)'}\\\`
                                                                        }}>
                                                                            <img src={\\\`/items/\\\${matId}.webp\\\`} alt={m} style={{ width: '14px', height: '14px', marginBottom: '2px' }} />
                                                                            <div style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', textTransform: 'uppercase' }}>T{tier} {m}</div>
                                                                            <div style={{ fontSize: '0.5rem', color: hasMat ? '#44ff44' : '#ff4444', fontWeight: 'bold' }}>
                                                                                {currentMat >= 1000 ? (currentMat / 1000).toFixed(1) + 'K' : currentMat} / {matAmount >= 1000 ? (matAmount / 1000).toFixed(0) + 'K' : matAmount}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            
                                                            <motion.button
                                                                whileHover={{ scale: 1.02 }}
                                                                whileTap={{ scale: 0.98 }}
                                                                disabled={!canUpgrade}
                                                                onClick={() => socket?.emit('upgrade_guild_building', { buildingType: 'REFINING_STATION', path })}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px',
                                                                    background: canUpgrade ? color : 'rgba(255,255,255,0.05)',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    color: canUpgrade ? '#000' : 'rgba(255,255,255,0.2)',
                                                                    fontWeight: 'bold',
                                                                    fontSize: '0.7rem',
                                                                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                                                                    marginTop: '5px'
                                                                }}
                                                            >
                                                                {isMax ? 'MAX LEVEL' : isSyncBlocked ? 'LOCKED BY SYNC' : canUpgrade ? 'UPGRADE' : 'MISSING REQUIREMENTS'}
                                                            </motion.button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ background: 'rgba(68, 255, 68, 0.05)', border: '1px solid rgba(68, 255, 68, 0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center', marginTop: '10px' }}>
                                                            <Check size={16} color="#44ff44" style={{ margin: '0 auto 4px' }} />
                                                            <div style={{ color: '#44ff44', fontSize: '0.65rem', fontWeight: 'bold' }}>MAX LEVEL</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontStyle: 'italic' }}>
                                        * Upgrades consume Silver and {GUILD_BUILDINGS.REFINING_STATION.baseMaterialCost.toLocaleString()} of each T(Lv) material from the Guild Bank.
                                    </div>
                                </div>
                            )}
`;

const newContent = content.substring(0, gatheringStart) + cleanCode + content.substring(bankStart);
fs.writeFileSync('GuildPanel.jsx', newContent);
console.log("GuildPanel.jsx fixed.");
