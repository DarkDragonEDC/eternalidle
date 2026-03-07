import fs from 'fs';
const path = 'c:/Users/Administrator/Desktop/Jogo/eternalidle/client/src/components/GuildPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

const hallStart = content.indexOf('{/* GUILD_HALL Section */}');
const gatheringStart = content.indexOf('{/* GATHERING_STATION Section */}');

if (hallStart !== -1 && gatheringStart !== -1) {
    const hallBlock = '{/* GUILD_HALL Section */}\\n' +
'                            {selectedBuilding === \'GUILD_HALL\' && (\\n' +
'                                <div style={{ display: \'flex\', flexDirection: \'column\', gap: \'20px\' }}>\\n' +
'                                    <div style={{ display: \'flex\', alignItems: \'center\', gap: \'15px\' }}>\\n' +
'                                        <div style={{ background: \'rgba(212, 175, 55, 0.1)\', padding: \'10px\', borderRadius: \'15px\' }}>\\n' +
'                                            <Building2 size={30} color="var(--accent)" />\\n' +
'                                        </div>\\n' +
'                                        <div>\\n' +
'                                            <h3 style={{ color: \'var(--accent)\', margin: 0, fontSize: isMobile ? \'1rem\' : \'1.1rem\' }}>GUILD HALL</h3>\\n' +
'                                            <div style={{ color: \'#fff\', fontSize: isMobile ? \'1.1rem\' : \'1.2rem\', fontWeight: \'bold\' }}>LVL {guild.guild_hall_level || 0}</div>\\n' +
'                                            <div style={{ color: \'var(--accent)\', fontSize: \'0.6rem\', fontWeight: \'bold\' }}>MAX LVL 10</div>\\n' +
'                                        </div>\\n' +
'                                    </div>\\n' +
'\\n' +
'                                    <div style={{ display: \'grid\', gridTemplateColumns: isMobile ? \'repeat(2, 1fr)\' : \'repeat(auto-fit, minmax(140px, 1fr))\', gap: isMobile ? \'10px\' : \'15px\', marginBottom: isMobile ? \'20px\' : \'25px\' }}>\\n' +
'                                        <div style={{ background: \'rgba(255,255,255,0.03)\', padding: isMobile ? \'10px\' : \'12px\', borderRadius: \'12px\', border: \'1px solid rgba(255,255,255,0.05)\' }}>\\n' +
'                                            <div style={{ color: \'rgba(255,255,255,0.4)\', fontSize: \'0.6rem\', marginBottom: \'5px\', textTransform: \'uppercase\' }}>Current Slots</div>\\n' +
'                                            <div style={{ color: \'#fff\', fontSize: isMobile ? \'1rem\' : \'1.1rem\', fontWeight: \'bold\' }}>{10 + (guild.guild_hall_level || 0) * 2} <span style={{ fontSize: \'0.7rem\', color: \'rgba(255,255,255,0.3)\' }}>Members</span></div>\\n' +
'                                        </div>\\n' +
'                                        <div style={{ background: \'rgba(255,255,255,0.03)\', padding: isMobile ? \'10px\' : \'12px\', borderRadius: \'12px\', border: \'1px solid rgba(255,255,255,0.05)\' }}>\\n' +
'                                            <div style={{ color: \'rgba(255,255,255,0.4)\', fontSize: \'0.6rem\', marginBottom: \'5px\', textTransform: \'uppercase\' }}>Next Level</div>\\n' +
'                                            <div style={{ color: \'#fff\', fontSize: isMobile ? \'1rem\' : \'1.1rem\', fontWeight: \'bold\' }}>\\n' +
'                                                {(guild.guild_hall_level || 0) < 10 ? 10 + ((guild.guild_hall_level || 0) + 1) * 2 : \'MAX\'}\\n' +
'                                                {(guild.guild_hall_level || 0) < 10 && <span style={{ fontSize: \'0.7rem\', color: \'rgba(255,255,255,0.3)\' }}> Slots</span>}\\n' +
'                                            </div>\\n' +
'                                        </div>\\n' +
'                                    </div>\\n' +
'\\n' +
'                                    {(guild.guild_hall_level || 0) < 10 ? (\\n' +
'                                        <>\\n' +
'                                            <div style={{ marginBottom: \'15px\' }}>\\n' +
'                                                <div style={{ color: \'rgba(255,255,255,0.6)\', fontSize: \'0.75rem\', fontWeight: \'bold\', marginBottom: \'10px\' }}>UPGRADE REQUIREMENTS</div>\\n' +
'                                                <div style={{ display: \'grid\', gridTemplateColumns: isMobile ? \'repeat(2, 1fr)\' : \'repeat(auto-fill, minmax(120px, 1fr))\', gap: \'10px\' }}>\\n' +
'                                                    {/* Silver Cost */}\\n' +
'                                                    <div style={{\\n' +
'                                                        background: \'rgba(0,0,0,0.3)\',\\n' +
'                                                        padding: isMobile ? \'8px\' : \'10px\',\\n' +
'                                                        borderRadius: \'10px\',\\n' +
'                                                        border: \'1px solid rgba(255,255,255,0.05)\',\\n' +
'                                                        display: \'flex\',\\n' +
'                                                        alignItems: \'center\',\\n' +
'                                                        gap: isMobile ? \'6px\' : \'10px\'\\n' +
'                                                    }}>\\n' +
'                                                        <Coins size={isMobile ? 14 : 16} color="#ffd700" />\\n' +
'                                                        <div>\\n' +
'                                                            <div style={{ color: (guild.bank_silver || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost) ? \'#44ff44\' : \'#ff4444\', fontSize: isMobile ? \'0.7rem\' : \'0.75rem\', fontWeight: \'bold\' }}>\\n' +
'                                                                {(GUILD_BUILDINGS.GUILD_HALL.baseSilverCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelSilverCost).toLocaleString()}\\n' +
'                                                            </div>\\n' +
'                                                            <div style={{ color: \'rgba(255,255,255,0.3)\', fontSize: \'0.55rem\' }}>Silver (Bank)</div>\\n' +
'                                                        </div>\\n' +
'                                                    </div>\\n' +
'\\n' +
'                                                    {/* GP Cost */}\\n' +
'                                                    <div style={{\\n' +
'                                                        background: \'rgba(0,0,0,0.3)\',\\n' +
'                                                        padding: isMobile ? \'8px\' : \'10px\',\\n' +
'                                                        borderRadius: \'10px\',\\n' +
'                                                        border: \'1px solid rgba(255,255,255,0.05)\',\\n' +
'                                                        display: \'flex\',\\n' +
'                                                        alignItems: \'center\',\\n' +
'                                                        gap: isMobile ? \'6px\' : \'10px\'\\n' +
'                                                    }}>\\n' +
'                                                        <ClipboardList size={isMobile ? 14 : 16} color="var(--accent)" />\\n' +
'                                                        <div>\\n' +
'                                                            <div style={{ color: (guild.guild_points || 0) >= (GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost) ? \'#44ff44\' : \'#ff4444\', fontSize: isMobile ? \'0.7rem\' : \'0.75rem\', fontWeight: \'bold\' }}>\\n' +
'                                                                {(GUILD_BUILDINGS.GUILD_HALL.baseGPCost + (guild.guild_hall_level || 0) * GUILD_BUILDINGS.GUILD_HALL.perLevelGPCost).toLocaleString()}\\n' +
'                                                            </div>\\n' +
'                                                            <div style={{ color: \'rgba(255,255,255,0.3)\', fontSize: \'0.55rem\' }}>GP (Bank)</div>\\n' +
'                                                        </div>\\n' +
'                                                    </div>\\n' +
'\\n' +
'                                                    {/* Material Costs */}\\n' +
'                                                    {(() => {\\n' +
'                                                        const tier = Math.min(10, (guild.guild_hall_level || 0) + 1);\\n' +
'                                                        return [\\n' +
'                                                            { id: `T${tier}_WOOD`, name: `T${tier} Wood`, icon: `/items/T${tier}_WOOD.webp` },\\n' +
'                                                            { id: `T${tier}_ORE`, name: `T${tier} Ore`, icon: `/items/T${tier}_ORE.webp` },\\n' +
'                                                            { id: `T${tier}_HIDE`, name: `T${tier} Hide`, icon: `/items/T${tier}_HIDE.webp` },\\n' +
'                                                            { id: `T${tier}_FIBER`, name: `T${tier} Fiber`, icon: `/items/T${tier}_FIBER.webp` },\\n' +
'                                                            { id: `T${tier}_FISH`, name: `T${tier} Fish`, icon: `/items/T${tier}_FISH.webp` },\\n' +
'                                                            { id: `T${tier}_HERB`, name: `T${tier} Herb`, icon: `/items/T${tier}_HERB.webp` }\\n' +
'                                                        ];\\n' +
'                                                    })().map(mat => {\\n' +
'                                                        const amount = guild.bank_items?.[mat.id] || 0;\\n' +
'                                                        const hasEnough = amount >= 1000;\\n' +
'\\n' +
'                                                        return (\\n' +
'                                                            <div key={mat.id} style={{\\n' +
'                                                                background: \'rgba(0,0,0,0.3)\',\\n' +
'                                                                padding: isMobile ? \'8px\' : \'10px\',\\n' +
'                                                                borderRadius: \'10px\',\\n' +
'                                                                border: \'1px solid rgba(255,255,255,0.05)\',\\n' +
'                                                                display: \'flex\',\\n' +
'                                                                alignItems: \'center\',\\n' +
'                                                                gap: isMobile ? \'6px\' : \'10px\'\\n' +
'                                                            }}>\\n' +
'                                                                <div style={{ width: isMobile ? \'16px\' : \'20px\', height: isMobile ? \'16px\' : \'20px\', position: \'relative\' }}>\\n' +
'                                                                    <img src={mat.icon} alt={mat.name} style={{ width: \'100%\', height: \'100%\', objectFit: \'contain\' }} />\\n' +
'                                                                </div>\\n' +
'                                                                <div>\\n' +
'                                                                    <div style={{ color: hasEnough ? \'#44ff44\' : \'#ff4444\', fontSize: isMobile ? \'0.7rem\' : \'0.75rem\', fontWeight: \'bold\' }}>\\n' +
'                                                                        {amount.toLocaleString()} / 1,000\\n' +
'                                                                    </div>\\n' +
'                                                                    <div style={{ color: \'rgba(255,255,255,0.3)\', fontSize: \'0.55rem\' }}>{mat.name} (Bank)</div>\\n' +
'                                                                </div>\\n' +
'                                                            </div>\\n' +
'                                                        );\\n' +
'                                                    })}\\n' +
'\\n' +
'                                                    {/* Guild Level Requirement */}\\n' +
'                                                    {(() => {\\n' +
'                                                        const nextLevel = (guild.guild_hall_level || 0) + 1;\\n' +
'                                                        const reqGuildLevel = Math.max(1, (nextLevel - 1) * 10);\\n' +
'                                                        const hasGuildLevel = (guild.level || 1) >= reqGuildLevel;\\n' +
'\\n' +
'                                                        return (\\n' +
'                                                            <div style={{\\n' +
'                                                                background: \'rgba(0,0,0,0.3)\',\\n' +
'                                                                padding: isMobile ? \'8px\' : \'10px\',\\n' +
'                                                                borderRadius: \'10px\',\\n' +
'                                                                border: \'1px solid rgba(255,255,255,0.05)\',\\n' +
'                                                                display: \'flex\',\\n' +
'                                                                alignItems: \'center\',\\n' +
'                                                                gap: isMobile ? \'6px\' : \'10px\'\\n' +
'                                                            }}>\\n' +
'                                                                <Trophy size={isMobile ? 14 : 16} color="#4488ff" />\\n' +
'                                                                <div>\\n' +
'                                                                    <div style={{ color: hasGuildLevel ? \'#44ff44\' : \'#ff4444\', fontSize: isMobile ? \'0.7rem\' : \'0.75rem\', fontWeight: \'bold\' }}>\\n' +
'                                                                        LVL {reqGuildLevel}\\n' +
'                                                                    </div>\\n' +
'                                                                    <div style={{ color: \'rgba(255,255,255,0.3)\', fontSize: \'0.55rem\' }}>Guild Level Req.</div>\\n' +
'                                                                </div>\\n' +
'                                                            </div>\\n' +
'                                                        );\\n' +
'                                                    })()}\\n' +
'                                                </div>\\n' +
'                                            </div>\\n' +
'\\n' +
'                                            <motion.button\\n' +
'                                                whileHover={playerHasPermission(\'manage_upgrades\') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 1.02 } : {}}\\n' +
'                                                whileTap={playerHasPermission(\'manage_upgrades\') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? { scale: 0.98 } : {}}\\n' +
'                                                disabled={\\n' +
'                                                    !playerHasPermission(\'manage_upgrades\') ||\\n' +
'                                                    (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10)\\n' +
'                                                }\\n' +
'                                                onClick={() => {\\n' +
'                                                    socket?.emit(\'upgrade_guild_building\', { buildingType: \'GUILD_HALL\' });\\n' +
'                                                }}\\n' +
'                                                style={{\\n' +
'                                                    width: \'100%\',\\n' +
'                                                    padding: \'12px\',\\n' +
'                                                    background: playerHasPermission(\'manage_upgrades\') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? \'var(--accent)\' : \'rgba(255,255,255,0.05)\',\\n' +
'                                                    border: \'none\',\\n' +
'                                                    borderRadius: \'12px\',\\n' +
'                                                    color: playerHasPermission(\'manage_upgrades\') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? \'#000\' : \'rgba(255,255,255,0.2)\',\\n' +
'                                                    fontWeight: \'bold\',\\n' +
'                                                    cursor: playerHasPermission(\'manage_upgrades\') && (guild.level || 1) >= Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? \'pointer\' : \'not-allowed\',\\n' +
'                                                    marginTop: \'10px\'\\n' +
'                                                }}\\n' +
'                                            >\\n' +
'                                                {!playerHasPermission(\'manage_upgrades\') ? \'NO PERMISSION\' : (guild.level || 1) < Math.max(1, ((guild.guild_hall_level || 0) + 1 - 1) * 10) ? \'GUILD LEVEL TOO LOW\' : \'UPGRADE GUILD HALL\'}\\n' +
'                                            </motion.button>\\n' +
'                                        </>\\n' +
'                                    ) : (\\n' +
'                                        <div style={{ background: \'rgba(68, 255, 68, 0.05)\', border: \'1px solid rgba(68, 255, 68, 0.2)\', borderRadius: \'15px\', padding: \'20px\', textAlign: \'center\' }}>\\n' +
'                                            <Check size={24} color="#44ff44" style={{ margin: \'0 auto 10px\' }} />\\n' +
'                                            <div style={{ color: \'#44ff44\', fontSize: \'1rem\', fontWeight: \'bold\' }}>MAX LEVEL REACHED</div>\\n' +
'                                            <p style={{ color: \'rgba(68, 255, 68, 0.6)\', fontSize: \'0.75rem\', margin: \'0 auto\' }}>Your guild hall is at its maximum capacity.</p>\\n' +
'                                        </div>\\n' +
'                                    )}\\n' +
'                                </div>\\n' +
'                            )}\\n';

    const pre = content.substring(0, hallStart);
    const post = content.substring(gatheringStart);
    content = pre + hallBlock + post;
    console.log("Fixed GUILD_HALL block");
}

fs.writeFileSync(path, content);
console.log("Success!");
