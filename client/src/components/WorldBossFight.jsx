import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, TrendingUp, Trophy, Swords, Minimize2 } from 'lucide-react';
import ResponsiveText from './ResponsiveText';

const WorldBossFight = ({ gameState, socket, onFinish, onMinimize }) => {
    const store = useAppStore();
    const storeType = store.activeWorldBossType || 'window';

    const [fightData, setFightData] = useState(() => {
        const persisted = gameState?.state?.activeWorldBossFight;
        if (persisted) {
            return {
                damage: persisted.damage || 0,
                elapsed: Math.max(0, Date.now() - persisted.startedAt),
                rankingPos: persisted.lastBroadcastPos || '--',
                status: 'ACTIVE',
                type: persisted.type || storeType
            };
        }
        return {
            damage: 0,
            elapsed: 0,
            rankingPos: '--',
            status: 'ACTIVE',
            type: storeType
        };
    });

    // Re-sync if gameState updates and damage changes significantly
    useEffect(() => {
        const persisted = gameState?.state?.activeWorldBossFight;
        if (persisted) {
            setFightData(prev => ({
                ...prev,
                damage: persisted.damage,
                rankingPos: persisted.lastBroadcastPos || prev.rankingPos,
                type: persisted.type || prev.type
            }));
        }
    }, [gameState?.state?.activeWorldBossFight?.damage]);

    const [logs, setLogs] = useState([]);
    const logsEndRef = React.useRef(null);

    const { worldBossUpdate } = store;
    const lastProcessedElapsed = React.useRef(null);

    useEffect(() => {
        if (!worldBossUpdate) return;

        const update = worldBossUpdate;
        setFightData(prev => ({
            ...prev,
            damage: update.damage !== undefined ? update.damage : prev.damage,
            elapsed: update.elapsed !== undefined ? update.elapsed : prev.elapsed,
            rankingPos: update.rankingPos !== undefined ? update.rankingPos : prev.rankingPos,
            status: update.status || prev.status,
            type: update.type || prev.type,
            bossHP: update.bossHP !== undefined ? update.bossHP : prev.bossHP,
            bossMaxHP: update.bossMaxHP !== undefined ? update.bossMaxHP : prev.bossMaxHP
        }));

        // Process Hits for Log with Staggering
        if (update.hits && Array.isArray(update.hits) && update.hits.length > 0 && lastProcessedElapsed.current !== update.elapsed) {
            lastProcessedElapsed.current = update.elapsed;
            update.hits.forEach((hit, index) => {
                setTimeout(() => {
                    const isCrit = hit.crit;
                    const angle = (Math.random() * Math.PI) - Math.PI;
                    const distance = (isCrit ? 100 : 70) + Math.random() * 40;
                    
                    const newHit = {
                        id: `${Date.now()}-${index}-${Math.random()}`,
                        damage: hit.damage,
                        crit: isCrit,
                        angle: angle,
                        distance: distance
                    };

                    setLogs(prev => {
                        const updated = [...prev, newHit];
                        return updated.slice(-15);
                    });
                }, index * 150); // 150ms delay between each hit visual
            });
        }

        if (update.status === 'FINISHED') {
            setTimeout(() => onFinish(update), 8000);
        }
    }, [worldBossUpdate, onFinish]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const timeLeft = Math.max(0, 70 - Math.floor(fightData.elapsed / 1000));
    const progress = Math.min(100, (fightData.elapsed / 60000) * 100);
    const isFinished = fightData.status === 'FINISHED';
    const isLowTime = timeLeft <= 10;

    // Auto-finish if time expired and we are still "ACTIVE"
    useEffect(() => {
        if (timeLeft <= 0 && !isFinished) {
            onFinish();
        }
    }, [timeLeft, isFinished, onFinish]);

    const bossObj = fightData.type === 'daily' ? store.wbStatus?.daily?.boss : store.wbStatus?.window?.boss;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 20000,
                background: '#0a0a0a',
                display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden'
            }}
        >
            {/* Background Layer */}
            {bossObj?.bg && (
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${bossObj.bg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.35,
                    filter: 'blur(4px)',
                    zIndex: 0
                }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at bottom, transparent 0%, #050505 80%)', zIndex: 0 }} />

            {/* Ambient particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div key={i} animate={{ y: [0, -300], x: [0, (i % 2 === 0 ? 40 : -40)], opacity: [0, 0.5, 0] }} transition={{ repeat: Infinity, duration: 4 + i * 0.5, delay: i * 0.7, ease: 'easeOut' }}
                    style={{ position: 'absolute', bottom: '-20px', left: `${10 + i * 11}%`, width: '4px', height: '4px', borderRadius: '50%', background: '#ff4d4d', boxShadow: '0 0 10px rgba(255,77,77,0.8)', pointerEvents: 'none', zIndex: 1 }} />
            ))}

            {/* Top Bar */}
            <div style={{ width: '100%', padding: '10px 24px 8px', maxWidth: '800px', position: 'relative', zIndex: 10 }}>
                <button 
                    onClick={onMinimize}
                    style={{ position: 'absolute', right: '10px', top: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    title="Minimize"
                >
                    <Minimize2 size={18} />
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    {/* Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: isLowTime ? 'rgba(220, 38, 38, 0.2)' : 'rgba(0,0,0,0.6)', borderRadius: '12px', border: `1px solid ${isLowTime ? 'rgba(220, 38, 38, 0.5)' : 'rgba(255,255,255,0.1)'}`, backdropFilter: 'blur(5px)' }}>
                        <Timer size={16} color={isLowTime ? '#ef4444' : '#ff4d4d'} />
                        <motion.span key={timeLeft} animate={isLowTime ? { scale: [1, 1.1, 1] } : {}} style={{ fontWeight: '900', color: isLowTime ? '#ef4444' : 'white', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '1px' }}>
                            {timeLeft}s
                        </motion.span>
                    </div>

                    {/* Ranking */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: 'rgba(0,0,0,0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)' }}>
                        <Trophy size={16} color="#d4af37" />
                        <span style={{ fontWeight: '900', color: '#d4af37', fontSize: '1rem', fontFamily: 'monospace' }}>
                            #{fightData.rankingPos}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.5)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: 'linear' }}
                        style={{ height: '100%', background: isLowTime ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #ff4d4d, #b91c1c)', borderRadius: '3px', boxShadow: `0 0 10px ${isLowTime ? 'rgba(239,68,68,0.8)' : 'rgba(255,77,77,0.5)'}` }} />
                </div>
            </div>

            {/* Central Area: Boss Image & Floaters */}
            <div style={{ flex: 1, position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                
                {/* Boss Details */}
                <div style={{ position: 'absolute', top: '10px', textAlign: 'center' }}>
                    <h2 style={{ color: '#ff4d4d', margin: 0, fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', textShadow: '0 0 20px rgba(255,0,0,0.6)' }}>
                        {bossObj?.name || 'BOSS FIGHT'}
                    </h2>
                    {fightData.type === 'window' ? (
                        <div style={{ color: '#4d94ff', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>TIER {bossObj?.tier} WORLD BOSS</div>
                    ) : (
                        <div style={{ color: '#d4af37', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>THE LEGENDARY DRAGON</div>
                    )}
                </div>

                {/* Boss Image Container */}
                <motion.div
                    animate={{ y: [-10, 10, -10], filter: ['drop-shadow(0 0 20px rgba(255,0,0,0.3))', 'drop-shadow(0 0 40px rgba(255,0,0,0.6))', 'drop-shadow(0 0 20px rgba(255,0,0,0.3))'] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                    style={{ position: 'relative', marginTop: '30px', display: 'flex', justifyContent: 'center' }}
                >
                    {bossObj?.image ? (
                        <img src={`/monsters/${bossObj.image}`} alt="Boss" style={{ maxHeight: '35vh', maxWidth: '80vw', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />
                    ) : (
                        <div style={{ fontSize: '80px' }}>🐲</div>
                    )}

                    {/* Floating Damage Texts */}
                    <AnimatePresence>
                        {logs.map((log) => {
                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                                    animate={{ opacity: [1, 1, 0], scale: log.crit ? 1.6 : 1.1, x: Math.cos(log.angle) * log.distance, y: (Math.sin(log.angle) * log.distance) - 100 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.0, ease: "easeOut" }}
                                    style={{
                                        position: 'absolute', top: '40%', left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        fontSize: log.crit ? '1.8rem' : '1.3rem',
                                        fontWeight: '900',
                                        color: log.crit ? '#ffd700' : 'white',
                                        textShadow: log.crit ? '0 0 15px rgba(255, 215, 0, 0.8), 0 0 30px #ff0000' : '0 0 10px rgba(255, 0, 0, 0.8)',
                                        letterSpacing: '1px',
                                        pointerEvents: 'none',
                                        zIndex: 20
                                    }}
                                >
                                    -{formatNumber(log.damage)}{log.crit && '!'}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
                
                {/* Boss HP Bar if Window Boss */}
                {fightData.type === 'window' && bossObj && (
                    <div style={{ width: '80%', maxWidth: '400px', marginTop: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: '800', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>HP</span>
                                <span>{formatNumber(worldBossUpdate?.bossHP ?? fightData.bossHP ?? bossObj.currentHP)} / {formatNumber(worldBossUpdate?.bossMaxHP ?? fightData.bossMaxHP ?? bossObj.maxHP)}</span>
                            </div>
                            <span>{Math.max(0, Math.min(100, (((worldBossUpdate?.bossHP ?? fightData.bossHP ?? bossObj.currentHP)) / (worldBossUpdate?.bossMaxHP ?? fightData.bossMaxHP ?? bossObj.maxHP)) * 100)).toFixed(1)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '12px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, ((worldBossUpdate?.bossHP || bossObj.currentHP) / (worldBossUpdate?.bossMaxHP || bossObj.maxHP)) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, #4d94ff, #80b3ff)', boxShadow: '0 0 10px rgba(77,148,255,0.6)' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Panel: Total Damage */}
            <div style={{ width: '100%', padding: '15px 20px 25px', background: 'linear-gradient(to top, #000 0%, rgba(0,0,0,0.8) 50%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <div style={{ color: 'rgba(255,77,77,0.8)', fontWeight: '800', letterSpacing: '8px', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Damage Dealt
                </div>
                
                <motion.div key={fightData.damage} initial={{ scale: 1 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.15, ease: "easeOut" }}>
                    <ResponsiveText maxFontSize={72} minFontSize={32} fontWeight="900" color="white" fontFamily="monospace" textShadow="0 0 30px rgba(255,77,77,0.5), 0 0 60px rgba(255,0,0,0.3)">
                        {formatNumber(fightData.damage)}
                    </ResponsiveText>
                </motion.div>
                
                <div style={{ display: 'flex', gap: '12px', opacity: 0.5, marginTop: '10px' }}>
                    <Swords size={20} color="#ff4d4d" />
                </div>
            </div>

            {/* ==== Finish Overlay ==== */}
            <AnimatePresence>
                {isFinished && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30000 }}>
                        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} style={{ textAlign: 'center' }}>
                            <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '5rem', marginBottom: '20px' }}>
                                🏆
                            </motion.div>
                            <h2 style={{ color: '#ff4d4d', fontSize: '2.5rem', fontWeight: '900', margin: '0 0 16px 0', letterSpacing: '6px', textShadow: '0 0 40px rgba(255,77,77,0.5)' }}>COMBAT FINISHED</h2>
                            
                            <div style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '16px', padding: '24px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>FINAL DAMAGE</div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'white', fontFamily: 'monospace' }}>{formatNumber(fightData.damage)}</div>
                                <div style={{ width: '100%', height: '1px', background: 'rgba(212, 175, 55, 0.2)', margin: '8px 0' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Trophy size={22} color="#d4af37" />
                                    <span style={{ fontSize: '1.4rem', color: '#d4af37', fontWeight: '800', letterSpacing: '2px' }}>RANK #{fightData.rankingPos}</span>
                                </div>
                            </div>
                            
                            <motion.p animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ color: 'var(--text-dim)', marginTop: '40px', fontSize: '0.9rem', letterSpacing: '3px', textTransform: 'uppercase' }}>
                                Leaving the arena...
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default WorldBossFight;
