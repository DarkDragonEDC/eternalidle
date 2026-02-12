import React, { useState, useEffect } from 'react';
import { formatNumber } from '@utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, TrendingUp, Trophy, Swords } from 'lucide-react';
import ResponsiveText from './ResponsiveText';

const WorldBossFight = ({ gameState, socket, onFinish }) => {
    const [fightData, setFightData] = useState({
        damage: 0,
        elapsed: 0,
        rankingPos: '--',
        status: 'ACTIVE'
    });

    const [logs, setLogs] = useState([]);
    const logsEndRef = React.useRef(null);

    useEffect(() => {
        if (!socket) return;
        const handleUpdate = (result) => {
            if (result.worldBossUpdate) {
                const update = result.worldBossUpdate;
                setFightData(prev => ({
                    ...prev,
                    damage: update.damage !== undefined ? update.damage : prev.damage,
                    elapsed: update.elapsed !== undefined ? update.elapsed : prev.elapsed,
                    rankingPos: update.rankingPos !== undefined ? update.rankingPos : prev.rankingPos,
                    status: update.status || prev.status
                }));

                // Process Hits for Log
                if (update.hits && update.hits.length > 0) {
                    const newLogs = update.hits.map(hit => ({
                        id: Date.now() + Math.random(),
                        damage: hit.damage,
                        crit: hit.crit
                    }));

                    setLogs(prev => {
                        const updated = [...prev, ...newLogs];
                        return updated.slice(-20); // Keep last 20
                    });
                }

                if (update.status === 'FINISHED') {
                    setTimeout(() => onFinish(update), 3000);
                }
            }
        };
        socket.on('action_result', handleUpdate);
        return () => socket.off('action_result', handleUpdate);
    }, [socket]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const timeLeft = Math.max(0, 60 - Math.floor(fightData.elapsed / 1000));
    const progress = Math.min(100, (fightData.elapsed / 60000) * 100);
    const isFinished = fightData.status === 'FINISHED';
    const isLowTime = timeLeft <= 10;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 20000,
                background: 'radial-gradient(ellipse at 50% 20%, rgba(40, 5, 5, 1) 0%, rgba(8, 2, 2, 1) 70%, #000 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden'
            }}
        >
            {/* Ambient particles */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [0, -200],
                        x: [0, (i % 2 === 0 ? 30 : -30)],
                        opacity: [0, 0.4, 0]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 3 + i * 0.5,
                        delay: i * 0.7,
                        ease: 'easeOut'
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '20%',
                        left: `${15 + i * 13}%`,
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: '#ff4d4d',
                        boxShadow: '0 0 8px rgba(255,77,77,0.6)',
                        pointerEvents: 'none'
                    }}
                />
            ))}

            {/* Top Bar */}
            <div style={{
                width: '100%',
                padding: '20px 24px 16px',
                maxWidth: '700px'
            }}>
                {/* Stats Row */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                }}>
                    {/* Timer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: isLowTime ? 'rgba(220, 38, 38, 0.15)' : 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        border: `1px solid ${isLowTime ? 'rgba(220, 38, 38, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.3s ease'
                    }}>
                        <Timer size={15} color={isLowTime ? '#ef4444' : '#ff4d4d'} />
                        <motion.span
                            key={timeLeft}
                            animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
                            style={{
                                fontWeight: '800',
                                color: isLowTime ? '#ef4444' : 'white',
                                fontSize: '0.9rem',
                                fontFamily: 'monospace',
                                letterSpacing: '1px'
                            }}
                        >
                            {timeLeft}s
                        </motion.span>
                    </div>

                    {/* Ranking */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)'
                    }}>
                        <TrendingUp size={15} color="#22c55e" />
                        <span style={{
                            fontWeight: '800',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontFamily: 'monospace'
                        }}>
                            #{fightData.rankingPos}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '5px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: 'linear' }}
                        style={{
                            height: '100%',
                            background: isLowTime
                                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                : 'linear-gradient(90deg, #ff4d4d, #b91c1c)',
                            borderRadius: '3px',
                            boxShadow: `0 0 8px ${isLowTime ? 'rgba(239,68,68,0.5)' : 'rgba(255,77,77,0.3)'}`
                        }}
                    />
                </div>
            </div>

            {/* Central Combat Zone */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '90vw',
                padding: '0 20px',
                gap: '8px'
            }}>
                {/* Damage Counter */}
                <motion.div
                    key={fightData.damage}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.008, 1] }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ width: '100%' }}
                >
                    <ResponsiveText
                        maxFontSize={80}
                        minFontSize={24}
                        fontWeight="950"
                        color="white"
                        fontFamily="monospace"
                        textShadow="0 0 40px rgba(255,255,255,0.35), 0 0 80px rgba(255, 77, 77, 0.2)"
                    >
                        {formatNumber(fightData.damage)}
                    </ResponsiveText>
                </motion.div>

                <div style={{
                    color: 'rgba(255,77,77,0.6)',
                    fontWeight: '700',
                    letterSpacing: '6px',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase'
                }}>
                    Total Damage
                </div>

                {/* Damage Log Scroll */}
                <div style={{
                    height: '100px',
                    width: '200px',
                    marginTop: '20px',
                    overflow: 'hidden',
                    position: 'relative',
                    maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
                }}>
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                    }}>
                        <AnimatePresence>
                            {logs.map((log) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, y: 10, scale: log.crit ? 1.2 : 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    style={{
                                        fontSize: log.crit ? '1.1rem' : '0.9rem',
                                        fontWeight: log.crit ? '900' : 'bold',
                                        color: log.crit ? '#ffd700' : 'rgba(255, 255, 255, 0.6)',
                                        textShadow: log.crit
                                            ? '0 0 10px rgba(255, 215, 0, 0.6), 0 0 20px rgba(255, 77, 77, 0.4)'
                                            : '0 0 5px rgba(255, 77, 77, 0.5)',
                                        letterSpacing: log.crit ? '1px' : 'normal'
                                    }}
                                >
                                    +{formatNumber(log.damage)}{log.crit && '!'}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>

            {/* Combat Visualization */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '60px',
                marginBottom: '40px',
                padding: '20px'
            }}>
                {/* Player */}
                <motion.div
                    animate={{ x: [0, 8, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
                    style={{
                        fontSize: '3.5rem',
                        filter: 'drop-shadow(0 0 8px rgba(100,200,255,0.3))'
                    }}
                >
                    🛡️
                </motion.div>

                {/* VS Slash */}
                <motion.div
                    animate={{ opacity: [0.3, 1, 0.3], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    style={{
                        fontSize: '1.5rem',
                        color: '#ff4d4d',
                        fontWeight: '900',
                        textShadow: '0 0 20px rgba(255,77,77,0.5)'
                    }}
                >
                    ⚔️
                </motion.div>

                {/* Dragon */}
                <motion.div
                    animate={{ scale: [1, 1.06, 1], rotate: [0, -2, 2, 0] }}
                    transition={{ repeat: Infinity, duration: 0.4 }}
                    style={{
                        fontSize: '5rem',
                        filter: 'drop-shadow(0 0 20px rgba(255,0,0,0.4))'
                    }}
                >
                    🐲
                </motion.div>
            </div>

            {/* ==== Finish Overlay ==== */}
            <AnimatePresence>
                {isFinished && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.92)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            style={{ textAlign: 'center' }}
                        >
                            <motion.div
                                animate={{ rotate: [0, -5, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ fontSize: '4rem', marginBottom: '16px' }}
                            >
                                🏆
                            </motion.div>
                            <h2 style={{
                                color: '#ff4d4d',
                                fontSize: '2.2rem',
                                fontWeight: '900',
                                margin: '0 0 12px 0',
                                letterSpacing: '4px',
                                textShadow: '0 0 30px rgba(255,77,77,0.4)'
                            }}>
                                COMBAT FINISHED
                            </h2>
                            <div style={{
                                padding: '12px 32px',
                                background: 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.25)',
                                borderRadius: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <Trophy size={20} color="#d4af37" />
                                <span style={{
                                    fontSize: '1.3rem',
                                    color: '#d4af37',
                                    fontWeight: '800',
                                    letterSpacing: '2px'
                                }}>
                                    RANK #{fightData.rankingPos}
                                </span>
                            </div>
                            <motion.p
                                animate={{ opacity: [0.3, 0.7, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{ color: 'var(--text-dim)', marginTop: '32px', fontSize: '0.85rem', letterSpacing: '2px' }}
                            >
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
