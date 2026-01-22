import React, { useState } from 'react';
import { Castle, Shield, Sword, Trophy, Coins, Star, Clock, ChevronRight, Zap, Skull, Box } from 'lucide-react';
import { DUNGEONS } from '@shared/dungeons';

const DungeonPanel = ({ socket, gameState, isMobile }) => {
    const [selectedDungeonId, setSelectedDungeonId] = useState(null);

    const handleEnterDungeon = (dungeonId) => {
        socket.emit('start_dungeon', { dungeonId });
    };

    const dungeon = gameState?.state?.dungeon;
    const combat = gameState?.state?.combat;

    if (dungeon) {
        return (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '25px', background: 'rgba(50, 20, 100, 0.1)', border: '1px solid rgba(150, 100, 255, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                        <div style={{ background: '#7e22ce', padding: '12px', borderRadius: '10px' }}>
                            <Castle color="#fff" size={32} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: '900', letterSpacing: '2px' }}>DUNGEON ACTIVE</div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{dungeon.name}</h2>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>FLOOR</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{dungeon.currentLevel} / {dungeon.maxLevels}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>ROOM</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{dungeon.currentRoom} / {dungeon.roomsPerLevel}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>STATUS</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4caf50' }}>{combat ? 'FIGHTING' : 'PREPARING'}</div>
                        </div>
                    </div>
                </div>

                {combat && (
                    <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)' }}>Combat in progress in the dungeon...</p>
                        <button
                            onClick={() => { }} // Navigate to combat tab or just show combat here?
                            style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '5px', cursor: 'pointer' }}
                        >
                            VIEW COMBAT
                        </button>
                    </div>
                )}

                <div className="glass-panel scroll-container" style={{ flex: 1, padding: '15px', overflowY: 'auto', background: 'rgba(10,10,15,0.6)', minHeight: '200px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#a855f7', letterSpacing: '1px', marginBottom: '10px' }}>DUNGEON LOGS_</div>
                    {dungeon.logs?.map((log, i) => (
                        <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ color: '#a855f7', opacity: 0.5 }}>[{i + 1}]</span> {log}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', gap: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>DUNGEONS</h2>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} /> Combat Lv Required
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {Object.values(DUNGEONS).map(d => {
                    const isLocked = (gameState?.state?.skills?.COMBAT?.level || 1) < d.minLevel;

                    return (
                        <div key={d.id} className="glass-panel" style={{
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            background: isLocked ? 'rgba(0,0,0,0.4)' : 'rgba(15, 20, 30, 0.4)',
                            opacity: isLocked ? 0.6 : 1,
                            transition: '0.3s',
                            cursor: 'default'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ background: isLocked ? '#333' : '#7e22ce', padding: '10px', borderRadius: '8px' }}>
                                        <Castle color="#fff" size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{d.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Tier {d.tier} • {d.levels} Floors</div>
                                    </div>
                                </div>
                                {isLocked && <Skull size={20} color="#ff4444" />}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)' }}>BOSS</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ff4444' }}>{d.boss.replace(/_/g, ' ')}</div>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)' }}>MIN LEVEL</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Combat Lv {d.minLevel}</div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>POSSIBLE REWARDS</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    <span style={{ fontSize: '0.7rem', background: 'rgba(212, 175, 55, 0.1)', color: '#d4af37', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                                        {d.rewards.silver[0]}-{d.rewards.silver[1]} Silver
                                    </span>
                                    {Object.keys(d.rewards.loot).map(lootId => (
                                        <span key={lootId} style={{ fontSize: '0.7rem', background: 'rgba(255,215,0,0.05)', color: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {lootId}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => !isLocked && handleEnterDungeon(d.id)}
                                disabled={isLocked}
                                style={{
                                    marginTop: '10px',
                                    padding: '12px',
                                    background: isLocked ? '#222' : 'linear-gradient(90deg, #7e22ce, #9333ea)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '900',
                                    fontSize: '0.8rem',
                                    letterSpacing: '1px',
                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                    transition: '0.2s'
                                }}
                            >
                                {isLocked ? `LOCKED (LV ${d.minLevel})` : 'ENTER DUNGEON'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DungeonPanel;
