
import React, { useState } from 'react';
import { Skull, Map as MapIcon, Shield, Lock, ChevronRight, AlertTriangle } from 'lucide-react';
import { ITEMS } from '@shared/items';

const DungeonPanel = ({ gameState, socket, isMobile }) => {
    const [selectedTier, setSelectedTier] = useState(1);
    const dungeonState = gameState?.dungeon_state || gameState?.state?.dungeon; // Handle both structures

    // If inside a dungeon, show status
    if (dungeonState && dungeonState.active) {
        return (
            <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={{ fontSize: '2rem', color: '#ff4444' }}>
                    <Skull size={64} />
                </div>
                <h2 style={{ color: '#fff', fontSize: '1.5rem', textTransform: 'uppercase' }}>
                    {dungeonState.status === 'BOSS_FIGHT' ? 'BOSS FIGHT' : `WAVE ${dungeonState.wave} / ${dungeonState.maxWaves}`}
                </h2>
                <div style={{ color: '#aaa', fontSize: '1rem' }}>
                    {dungeonState.status === 'PREPARING' && "Preparing..."}
                    {dungeonState.status === 'FIGHTING' && "Battle in progress..."}
                    {dungeonState.status === 'WAITING_NEXT_WAVE' && "Next wave incoming..."}
                    {dungeonState.status === 'BOSS_FIGHT' && "DEFEAT THE BOSS!"}
                </div>
                {/* Status is mostly handled by CombatPanel overlaid or integrated. 
                    Actually, if combat is active, App.jsx likely switches to CombatPanel. 
                    This view is for when 'between waves' or checking dungeon status explicitly. */}
                <button
                    onClick={() => socket.emit('stop_dungeon')}
                    className="glass-button"
                    style={{
                        padding: '12px 25px',
                        background: 'rgba(255, 59, 48, 0.1)',
                        border: '1px solid rgba(255, 59, 48, 0.2)',
                        color: '#ff3b30',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        marginTop: '20px'
                    }}
                >
                    ABANDON DUNGEON
                </button>
            </div>
        );
    }

    // List of Dungeons
    const tiers = Array.from({ length: 10 }, (_, i) => i + 1);

    const handleEnterDungeon = (tier) => {
        socket.emit('start_dungeon', { tier: tier, dungeonId: `DUNGEON_T${tier}` });
    };

    const inventory = gameState?.state?.inventory || {};

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <MapIcon color="#ae00ff" size={24} />
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.2rem' }}>Dungeons</h2>
            </div>

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.3)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <AlertTriangle color="#ff4444" size={20} />
                    <div style={{ fontSize: '0.8rem', color: '#ddd' }}>
                        <strong>Hardcore Zone:</strong> If you die inside a dungeon, you fail instantly and lose the map.
                    </div>
                </div>

                {tiers.map(tier => {
                    const mapId = `T${tier}_DUNGEON_MAP`;
                    const hasMap = (inventory[mapId] || 0) > 0;
                    const recommendedIp = tier * 100; // Rough estimate

                    return (
                        <div key={tier} style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px',
                            padding: '15px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            opacity: hasMap ? 1 : 0.7
                        }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{
                                    width: '50px', height: '50px',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: `1px solid ${hasMap ? '#ae00ff' : '#444'}`
                                }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: hasMap ? '#ae00ff' : '#666' }}>T{tier}</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>Dungeon Tier {tier}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        Required: <span style={{ color: hasMap ? '#4caf50' : '#ff4444' }}>1x {ITEMS[mapId]?.name || mapId}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleEnterDungeon(tier)}
                                disabled={!hasMap}
                                style={{
                                    padding: '10px 20px',
                                    background: hasMap ? '#ae00ff' : 'rgba(255,255,255,0.05)',
                                    color: hasMap ? '#fff' : '#555',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: hasMap ? 'pointer' : 'not-allowed',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: '0.2s',
                                    boxShadow: hasMap ? '0 0 15px rgba(174, 0, 255, 0.3)' : 'none'
                                }}
                            >
                                {hasMap ? (
                                    <>ENTER <ChevronRight size={16} /></>
                                ) : (
                                    <><Lock size={16} /> LOCKED</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DungeonPanel;
