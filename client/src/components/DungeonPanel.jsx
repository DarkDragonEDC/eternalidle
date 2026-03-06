import React, { useState, useEffect } from 'react';
import { formatNumber, formatSilver } from '@utils/format';
import { Skull, Map as MapIcon, Shield, Lock, ChevronRight, AlertTriangle, Star, Coins, History, Heart, Sword, Package, Layers, Clock, Sparkles } from 'lucide-react';
import { ITEMS, resolveItem } from '@shared/items';
import { MONSTERS } from '@shared/monsters';
import { DUNGEONS, FOOD_COST_MATRIX, getFoodCost, getDungeonDuration } from '@shared/dungeons';
import DungeonHistoryModal from './DungeonHistoryModal';
import ItemInfoModal from './ItemInfoModal';
import { motion, AnimatePresence } from 'framer-motion';

const DungeonPanel = ({ gameState, socket, isMobile, serverTimeOffset = 0, isPreviewActive, onPreviewActionBlocked }) => {
    const [selectedTier, setSelectedTier] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [pendingTier, setPendingTier] = useState(null);
    const [repeatCount, setRepeatCount] = useState(1);
    const [history, setHistory] = useState([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    const [selectedLootItem, setSelectedLootItem] = useState(null);
    const prevFoodAmtRef = React.useRef(null);
    const [lastFoodEatClient, setLastFoodEatClient] = useState(0);

    const avgIP = React.useMemo(() => {
        const equipment = gameState?.state?.equipment || {};
        const combatSlots = ['helmet', 'chest', 'boots', 'gloves', 'cape', 'mainHand', 'offHand'];
        let totalIP = 0;

        const hasWeapon = !!equipment.mainHand;

        combatSlots.forEach(slot => {
            const rawItem = equipment[slot];
            if (rawItem) {
                // Return early if no weapon and it's a combat gear slot
                if (!hasWeapon && slot !== 'mainHand') return;

                // Resolve item to ensure we have the 'ip' field even if it's missing in the cached raw state
                const item = { ...rawItem, ...resolveItem(rawItem.id || rawItem.item_id) };
                totalIP += item.ip || 0;
            }
        });

        // Always divide by 7 (the number of combat slots) to ensure removing items lowers the score
        return Math.floor(totalIP / 7);
    }, [gameState?.state?.equipment]);

    React.useEffect(() => {
        if (socket) {
            socket.on('dungeon_history_update', (data) => {
                setHistory(data);
            });
            // Initial fetch
            socket.emit('get_dungeon_history');
        }
        return () => {
            if (socket) {
                socket.off('dungeon_history_update');
            }
        };
    }, [socket]);

    const handleEnterClick = (tier) => {
        if (isPreviewActive) {
            onPreviewActionBlocked?.();
            return;
        }
        setPendingTier(tier);
        setRepeatCount(1); // Reset to 1
        setShowModal(true);
    };

    const calculateEstimatedTime = (tier, count) => {
        const timeForOne = getDungeonDuration(tier, avgIP);
        return timeForOne * count;
    };

    const formatDuration = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    // Calculate max runs possible in 12 hours
    const calculateMaxRunsIn12Hours = (tier) => {
        const timeFor1Run = calculateEstimatedTime(tier, 1);
        if (timeFor1Run <= 0) return 1;
        const maxTime = 12 * 60 * 60 * 1000; // 12 hours in ms
        return Math.max(1, Math.floor(maxTime / timeFor1Run));
    };

    // Simplified survival check (always survives now as it's time-based)
    const calculateSurvival = (tier, count) => {
        return { survives: true, runsBeforeDeath: count, totalDamagePerRun: 0, totalEffectiveHp: 100 };
    };

    const confirmEnterDungeon = () => {
        if (pendingTier) {
            const dungeon = Object.values(DUNGEONS).find(d => d.tier === pendingTier);
            if (dungeon) {
                // repeatCount is total runs, so we send repeatCount - 1 as "extra repeats"
                const totalRuns = parseInt(repeatCount, 10) || 1;
                socket.emit('start_dungeon', {
                    dungeonId: dungeon.id,
                    repeatCount: Math.max(0, totalRuns - 1)
                });
            }
        }
        setShowModal(false);
        setPendingTier(null);
    };

    const dungeonState = gameState?.dungeon_state || gameState?.state?.dungeon; // Handle both structures

    // Local timer for smooth UI updates - Synced with server
    const [now, setNow] = useState(Date.now() - serverTimeOffset);
    React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now() - serverTimeOffset), 200);
        return () => clearInterval(timer);
    }, [serverTimeOffset]);

    // Track food changes to trigger client-side cooldown if server lastFoodAt is missing or delayed
    React.useEffect(() => {
        const food = gameState?.state?.equipment?.food;
        if (!food) {
            prevFoodAmtRef.current = null;
            return;
        }
        const amt = typeof food.amount === 'object' ? (food.amount.amount || 0) : (Number(food.amount) || 0);

        if (prevFoodAmtRef.current !== null && amt < prevFoodAmtRef.current) {
            setLastFoodEatClient(Date.now());
        }
        prevFoodAmtRef.current = amt;
    }, [gameState?.state?.equipment?.food?.amount]);

    const getEstimatedTime = () => {
        if (!dungeonState || !dungeonState.active) return null;

        const duration = 300000; // 5 minutes in ms
        const elapsedSinceStart = dungeonState.started_at ? (now - new Date(dungeonState.started_at).getTime()) : 0;
        const currentRunRemaining = Math.max(0, duration - elapsedSinceStart);

        const repeats = dungeonState.repeatCount || 0;
        const queueMs = currentRunRemaining + (repeats * duration);

        const formatTime = (ms) => {
            if (ms <= 0) return "0m 1s";
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            if (h > 0) return `${h}h ${m}m ${s}s`;
            return `${m}m ${s}s`;
        };

        return {
            current: formatTime(currentRunRemaining),
            queue: formatTime(queueMs)
        };
    };

    const estimatedTime = getEstimatedTime();
    const inventory = gameState?.state?.inventory || {};

    // Shared Modals
    const modals = (
        <>
            {/* Enter Dungeon Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="glass-panel" style={{
                        padding: '30px',
                        width: '360px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        borderRadius: '24px',
                        border: '1px solid var(--accent)',
                        background: 'var(--panel-bg)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                    }}>
                        {(() => {
                            const dungeon = Object.values(DUNGEONS).find(d => d.tier === pendingTier);
                            const mapId = dungeon?.reqItem;
                            const mapEntry = inventory[mapId];
                            const availableMaps = (mapEntry && typeof mapEntry === 'object') ? (mapEntry.amount || 0) : (Number(mapEntry) || 0);

                            const maxRunsIn12h = calculateMaxRunsIn12Hours(pendingTier);

                            // Calculate total runs possible by EQUIPPED food only
                            let totalFoodRuns = 0;
                            const playerIP = avgIP || 0;
                            const eqFood = gameState?.state?.equipment?.food;

                            if (eqFood && eqFood.amount > 0) {
                                const foodTier = eqFood.tier || (eqFood.id ? parseInt(eqFood.id.match(/T(\d+)/)?.[1] || '0') : 0);
                                const foodQty = (typeof eqFood.amount === 'object' ? eqFood.amount.amount : eqFood.amount) || 0;
                                const cost = getFoodCost(pendingTier, foodTier, playerIP);

                                if (cost > 0) {
                                    totalFoodRuns = Math.floor(foodQty / cost);
                                }
                            }

                            const effectiveMax = Math.min(availableMaps, maxRunsIn12h, totalFoodRuns || 1);

                            const survival = calculateSurvival(pendingTier, repeatCount);
                            const food = gameState?.state?.equipment?.food;
                            const freshFood = food ? resolveItem(food.id) : null;
                            const hasFood = food && food.amount > 0;

                            return (
                                <>
                                    <h3 style={{ margin: 0, color: 'var(--text-main)', textAlign: 'center', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>TOTAL RUNS T{pendingTier}</h3>

                                    <div style={{
                                        display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '16px',
                                        border: '1px solid rgba(174, 0, 255, 0.2)', width: '100%'
                                    }}>
                                        <button onClick={() => setRepeatCount(1)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#888', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}>MIN</button>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button onClick={() => setRepeatCount(prev => Math.max(1, (parseInt(prev) || 0) - 1))} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slot-bg)', color: 'var(--text-main)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                                            <input type="number" value={repeatCount} onChange={(e) => { const val = e.target.value; if (val === '') { setRepeatCount(''); } else { const parsed = parseInt(val); if (!isNaN(parsed)) { setRepeatCount(Math.min(effectiveMax, parsed)); } } }} onBlur={() => { if (repeatCount === '' || repeatCount === 0) { setRepeatCount(1); } }} style={{ width: '60px', padding: '5px', background: 'transparent', border: 'none', color: 'var(--text-main)', textAlign: 'center', fontWeight: 'bold', fontSize: '1.4rem', outline: 'none' }} />
                                            <button onClick={() => setRepeatCount(prev => Math.min(effectiveMax, (parseInt(prev) || 0) + 1))} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slot-bg)', color: 'var(--text-main)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                                        </div>
                                        <button onClick={() => setRepeatCount(effectiveMax)} style={{ padding: '8px 12px', background: 'rgba(174, 0, 255, 0.1)', color: '#ae00ff', borderRadius: '8px', border: '1px solid rgba(174, 0, 255, 0.3)', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}>MAX</button>
                                    </div>

                                    <div style={{ padding: '10px', background: 'var(--accent-soft)', borderRadius: '12px', border: '1px solid var(--accent)', width: '100%', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px', marginBottom: '4px' }}>Estimated Time</div>
                                        <div style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '900' }}>{formatDuration(calculateEstimatedTime(pendingTier, repeatCount))}</div>
                                        <div style={{ fontSize: '0.6rem', color: '#888', marginTop: '4px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                            <span>MAPS: {availableMaps}</span>
                                            <span>|</span>
                                            <span>FOOD: {totalFoodRuns}</span>
                                            <span>|</span>
                                            <span>MAX 12H: {maxRunsIn12h}</span>
                                        </div>
                                    </div>

                                    {/* Survival Prediction Removed */}

                                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                        <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--slot-bg)', color: 'var(--text-dim)', borderRadius: '12px', border: '1px solid var(--border)', fontWeight: 'bold', cursor: 'pointer' }}>CANCEL</button>
                                        <button onClick={confirmEnterDungeon} style={{ flex: 1, padding: '12px', background: 'linear-gradient(to bottom, #ae00ff, #8a00cc)', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(174, 0, 255, 0.3)' }}>START</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Abandon Confirmation Modal */}
            {showAbandonModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            padding: '30px',
                            width: '320px',
                            display: 'flex', flexDirection: 'column',
                            gap: '20px',
                            borderRadius: '24px',
                            border: '1px solid rgba(255, 68, 68, 0.2)',
                            background: '#121212',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <Skull size={32} color="#ff4444" style={{ marginBottom: '15px' }} />
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>ABANDON?</h3>
                            <p style={{ color: '#aaa', fontSize: '0.8rem', marginTop: '8px', lineHeight: '1.4' }}>
                                How would you like to proceed with your current run?
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    socket.emit('stop_dungeon_queue');
                                    setShowAbandonModal(false);
                                }}
                                style={{
                                    padding: '12px', borderRadius: '12px', background: 'rgba(174, 0, 255, 0.05)', border: '1px solid rgba(174, 0, 255, 0.3)',
                                    color: '#ae00ff', fontWeight: '900', cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem'
                                }}
                            >
                                Finish Current Run
                            </button>

                            <button
                                onClick={() => {
                                    socket.emit('stop_dungeon');
                                    setShowAbandonModal(false);
                                }}
                                style={{
                                    padding: '12px', borderRadius: '12px', background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255, 68, 68, 0.3)',
                                    color: '#ff4444', fontWeight: '900', cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem'
                                }}
                            >
                                Abandon Now
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAbandonModal(false)}
                            style={{
                                background: 'none', border: 'none', color: '#555',
                                fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem',
                                letterSpacing: '1px', marginTop: '5px'
                            }}
                        >
                            CANCEL
                        </button>
                    </motion.div>
                </div>
            )}

            <DungeonHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                history={history}
            />
        </>
    );

    // If inside a dungeon, show status
    if (dungeonState && dungeonState.active) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel"
                style={{
                    padding: '20px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: 'var(--panel-bg)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Background Glow */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px',
                    height: '200px',
                    background: dungeonState.status === 'BOSS_FIGHT' ? 'rgba(255, 0, 0, 0.08)' : 'rgba(174, 0, 255, 0.04)',
                    filter: 'blur(80px)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 0
                }} />

                <div style={{ display: 'flex', gap: '20px', textAlign: 'center', zIndex: 1, background: 'var(--bg-dark)', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Current Run
                        </div>
                        <div style={{ color: '#ae00ff', fontSize: '1.1rem', fontWeight: '900', fontFamily: 'monospace' }}>
                            {estimatedTime?.current || '--'}
                        </div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: '900', letterSpacing: '0.5px', marginBottom: '2px', textTransform: 'uppercase' }}>
                            Total Queue
                        </div>
                        <div style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '900', fontFamily: 'monospace' }}>
                            {estimatedTime?.queue || '--'}
                        </div>
                    </div>
                </div>

                {/* Arena / Walking Section */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    width: '100%',
                    maxWidth: '600px',
                    zIndex: 1,
                    padding: isMobile ? '10px' : '20px'
                }}>
                    {/* Player Side - Persistent */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: isMobile ? '50px' : '80px', height: isMobile ? '50px' : '80px',
                            background: 'linear-gradient(135deg, var(--accent) 0%, #003366 100%)',
                            borderRadius: '50%', border: isMobile ? '2px solid #fff' : '3px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 15px var(--accent-soft)',
                            marginBottom: '8px'
                        }}>
                            <Sword size={isMobile ? 24 : 40} color="#000" />
                        </div>
                        <div style={{ fontSize: isMobile ? '0.6rem' : '0.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{gameState?.name?.toUpperCase()}</div>
                        <div style={{
                            fontSize: isMobile ? '0.8rem' : '1.1rem',
                            fontWeight: '900',
                            color: '#4caf50',
                            marginTop: '2px',
                            display: 'flex',
                            gap: '4px'
                        }}>
                            <span>{formatNumber(Math.round(gameState?.state?.health || 0))}</span>
                            <span>/</span>
                            <span>{formatNumber(Math.round(gameState?.calculatedStats?.maxHP || gameState?.calculatedStats?.hp || 100))}</span>
                            <span style={{ fontSize: '0.6rem', alignSelf: 'center', marginLeft: '2px' }}>HP</span>
                        </div>
                    </div>

                    {/* Food and VS Label */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        {gameState?.state?.equipment?.food?.amount > 0 && (() => {
                            const food = gameState.state.equipment.food;
                            const amt = typeof food.amount === 'object' ? (food.amount.amount || 0) : (Number(food.amount) || 0);
                            const tier = food.tier || (food.id ? parseInt(food.id.match(/T(\d+)/)?.[1] || '0') : 0);

                            // Use server-provided lastFoodAt if available, fallback to client-side tracking
                            const serverLastFoodAt = gameState?.state?.lastFoodAt;
                            const effectiveLastEat = serverLastFoodAt ? new Date(serverLastFoodAt).getTime() : lastFoodEatClient;

                            const COOLDOWN_MS = 5000;
                            const elapsed = now - effectiveLastEat;
                            const progress = effectiveLastEat === 0 ? 1 : Math.max(0, Math.min(1, elapsed / COOLDOWN_MS));
                            const isReady = progress >= 1;

                            const size = isMobile ? 42 : 54;
                            const stroke = 3;
                            const radius = (size / 2) - stroke;
                            const circumference = 2 * Math.PI * radius;
                            const dashOffset = circumference * (1 - progress);

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <div style={{ position: 'relative', width: size, height: size }}>
                                        <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                                            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                                            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={isReady ? '#4caf50' : '#ff6b6b'} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.2s linear' }} />
                                        </svg>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img src={food.icon || `/items/${food.id}.webp`} alt="Food" style={{ width: isMobile ? 24 : 32, height: isMobile ? 24 : 32, objectFit: 'contain', opacity: isReady ? 1 : 0.5 }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: '900', color: isReady ? '#4caf50' : '#ff6b6b' }}>
                                        T{tier} × {amt}
                                    </div>
                                </div>
                            );
                        })()}

                        {(dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT') ? (
                            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-dim)', opacity: 0.2 }}>VS</div>
                        ) : (
                            <div style={{ height: '20px' }} />
                        )}
                    </div>

                    {/* Right Side - Mob or Walking */}
                    <div style={{ minWidth: isMobile ? '70px' : '120px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {(dungeonState.status === 'FIGHTING' || dungeonState.status === 'BOSS_FIGHT') ? (
                            <motion.div
                                key="mob"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0, scale: [1, 1.05, 1] }}
                                transition={{ scale: { repeat: Infinity, duration: 2 } }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                            >
                                <div style={{
                                    width: isMobile ? '50px' : '80px', height: isMobile ? '50px' : '80px',
                                    background: 'var(--slot-bg)',
                                    borderRadius: '50%', border: isMobile ? '2px solid #ff4444' : '3px solid #ff4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 15px rgba(255, 68, 68, 0.3)',
                                    marginBottom: '8px'
                                }}>
                                    {dungeonState.activeMob?.image ? (
                                        <img src={`/monsters/${dungeonState.activeMob.image}`} alt={dungeonState.activeMob.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                                    ) : (
                                        <Skull size={isMobile ? 24 : 40} color="#ff4444" />
                                    )}
                                </div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.8rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                    {dungeonState.activeMob?.name?.toUpperCase() || '???'}
                                </div>
                                <div style={{ fontSize: isMobile ? '0.8rem' : '1.1rem', fontWeight: '900', color: '#ff4444', marginTop: '2px', display: 'flex', gap: '4px' }}>
                                    <span>{formatNumber(Math.round(dungeonState.activeMob?.health || 0))}</span>
                                    <span>/</span>
                                    <span>{formatNumber(Math.round(dungeonState.activeMob?.maxHealth || 0))}</span>
                                    <span style={{ fontSize: '0.6rem', alignSelf: 'center', marginLeft: '2px' }}>HP</span>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="walking"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                            >
                                <div style={{
                                    width: isMobile ? '50px' : '80px', height: isMobile ? '50px' : '80px',
                                    background: 'rgba(174, 0, 255, 0.05)',
                                    borderRadius: '50%', border: isMobile ? '2px solid #ae00ff' : '3px solid #ae00ff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 15px rgba(174, 0, 255, 0.2)',
                                    marginBottom: '8px'
                                }}>
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 4 }}
                                        style={{ color: '#ae00ff' }}
                                    >
                                        <Skull size={isMobile ? 24 : 40} strokeWidth={1.5} />
                                    </motion.div>
                                </div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.8rem', fontWeight: '900', color: '#ae00ff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    WALKING
                                </div>
                                <div style={{ fontSize: isMobile ? '0.8rem' : '1.1rem', fontWeight: '900', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    {dungeonState.timeLeft || '?'}s
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Status and Wave Info */}
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                    <div style={{ color: '#ae00ff', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>
                        TIER {dungeonState.tier}
                    </div>
                    <motion.h2
                        key={dungeonState.wave}
                        style={{ color: 'var(--text-main)', fontSize: '1.4rem', fontWeight: '900', margin: 0, letterSpacing: '1px' }}
                    >
                        {dungeonState.status === 'BOSS_FIGHT' ? 'THE BOSS' : `WAVE ${dungeonState.wave} / ${dungeonState.maxWaves}`}
                    </motion.h2>
                    <div style={{ height: '20px', marginTop: '2px' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={dungeonState.status}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{
                                    color: dungeonState.status === 'COMPLETED' ? '#4caf50' :
                                        dungeonState.status === 'FAILED' ? '#ff4444' :
                                            dungeonState.status === 'BOSS_FIGHT' ? '#ff0000' : 'var(--text-dim)',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {dungeonState.status === 'PREPARING' && "Preparing..."}
                                {dungeonState.status === 'FIGHTING' && "In Combat"}
                                {dungeonState.status === 'WAITING_NEXT_WAVE' && "Next wave incoming..."}
                                {dungeonState.status === 'BOSS_FIGHT' && "BOSS FIGHT!"}
                                {dungeonState.status === 'WALKING' && `Walking... (${dungeonState.timeLeft || '?'}s)`}
                                {dungeonState.status === 'WAITING_EXIT' && `Exit in ${dungeonState.timeLeft || '?'}s`}
                                {dungeonState.status === 'COMPLETED' && "CLEARED!"}
                                {dungeonState.status === 'ERROR' && "ERROR"}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div style={{
                    padding: '4px 12px',
                    background: 'rgba(174, 0, 255, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(174, 0, 255, 0.2)',
                    color: '#ae00ff',
                    fontSize: '0.7rem',
                    fontWeight: '900',
                    zIndex: 1
                }}>
                    {(() => {
                        let total, current;
                        if (dungeonState.initialRepeats !== undefined) {
                            // New logic (Server-driven)
                            total = dungeonState.initialRepeats + 1;
                            current = total - dungeonState.repeatCount;
                        } else {
                            // Fallback logic for existing active sessions
                            // inferredTotal = completed (lootLog) + current (1) + remaining (repeatCount)
                            const completed = (dungeonState.lootLog || []).length;
                            const remaining = dungeonState.repeatCount || 0;
                            total = completed + 1 + remaining;
                            current = completed + 1;
                        }
                        return `RUN: ${current} / ${total}`;
                    })()}
                </div>

                {dungeonState.stopping && (
                    <div style={{
                        padding: '6px 14px',
                        background: 'rgba(255, 152, 0, 0.15)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 152, 0, 0.4)',
                        color: '#ff9800',
                        fontSize: '0.8rem',
                        fontWeight: '900',
                        zIndex: 1,
                        marginTop: '8px',
                        animation: 'pulse 1.5s infinite',
                        letterSpacing: '0.5px',
                        boxShadow: '0 0 10px rgba(255, 152, 0, 0.2)'
                    }}>
                        STOPPING AFTER THIS RUN
                    </div>
                )}

                {/* Real-time Loot Summary (Aggregated) */}
                <div
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        zIndex: 1
                    }}
                >
                    <div style={{ color: '#ae00ff', fontWeight: '900', fontSize: '0.6rem', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase', textAlign: 'center', opacity: 0.7 }}>
                        Session Rewards
                    </div>
                    {dungeonState.lootLog && dungeonState.lootLog.length > 0 ? (
                        (() => {
                            const totals = dungeonState.lootLog.reduce((acc, log) => {
                                acc.xp += (log.xp || 0);
                                (log.items || []).forEach(itemStr => {
                                    const match = itemStr.match(/^(\d+)x\s+(.+)$/);
                                    if (match) {
                                        const qty = parseInt(match[1]);
                                        const id = match[2];
                                        acc.items[id] = (acc.items[id] || 0) + qty;
                                    } else {
                                        acc.items[itemStr] = (acc.items[itemStr] || 0) + 1;
                                    }
                                });
                                return acc;
                            }, { xp: 0, items: {} });

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <div style={{ background: 'var(--slot-bg)', padding: '8px 20px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border)', minWidth: '120px' }}>
                                            <div style={{ color: 'var(--text-dim)', fontSize: '0.55rem', fontWeight: '900' }}>TOTAL XP Gained</div>
                                            <div style={{ color: '#4caf50', fontWeight: '900', fontSize: '1.2rem' }}>+{formatNumber(totals.xp)}</div>
                                        </div>
                                    </div>

                                    {Object.keys(totals.items).length > 0 && (
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '5px',
                                            justifyContent: 'center',
                                            maxHeight: '80px',
                                            overflowY: 'auto',
                                            padding: '8px',
                                            background: 'var(--panel-bg)',
                                            borderRadius: '10px'
                                        }}>
                                            {Object.entries(totals.items).map(([id, qty]) => {
                                                const itemData = resolveItem(id);
                                                return (
                                                    <div key={id} style={{
                                                        background: 'rgba(174, 0, 255, 0.1)',
                                                        color: '#ae00ff',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.7rem',
                                                        border: '1px solid rgba(174, 0, 255, 0.2)',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {qty}x {itemData?.name || id.replace(/_/g, ' ')}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        <div style={{ color: '#555', fontStyle: 'italic', textAlign: 'center', fontSize: '0.7rem' }}>
                            Waiting for rewards...
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        if (dungeonState.status === 'COMPLETED') {
                            socket.emit('stop_dungeon');
                        } else {
                            setShowAbandonModal(true);
                        }
                    }}
                    style={{
                        padding: '8px 20px',
                        background: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 68, 68, 0.05)',
                        border: '1px solid',
                        borderColor: dungeonState.status === 'COMPLETED' ? 'rgba(76, 175, 80, 0.5)' : '#ff4444',
                        color: dungeonState.status === 'COMPLETED' ? '#4caf50' : '#ff4444',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '900',
                        fontSize: '0.75rem',
                        zIndex: 1,
                        transition: '0.2s',
                        opacity: 1,
                        pointerEvents: 'auto'
                    }}
                >
                    {dungeonState.status === 'COMPLETED' ? 'FINISH' : dungeonState.stopping ? 'STOPPING...' : 'ABANDON'}
                </button>
                {modals}
            </motion.div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '15px', overflow: 'hidden' }}>
            {/* New Hunting Grounds Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel-bg)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sword color="#ff4444" size={18} />
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Hunting Grounds</h2>
                    </div>
                    <button
                        onClick={() => {
                            setIsHistoryOpen(true);
                            socket.emit('get_dungeon_history');
                        }}
                        style={{ background: 'none', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Clock size={12} /> HISTORY
                    </button>
                </div>
                <div className="scroll-container-h" style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTier(t)}
                            style={{
                                padding: '4px 12px',
                                flexShrink: 0,
                                background: selectedTier === t ? 'rgba(255, 44, 44, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid',
                                borderColor: selectedTier === t ? '#ff4444' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                color: selectedTier === t ? '#ff4444' : 'var(--text-dim)',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            T{t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>

                {Object.values(DUNGEONS)
                    .filter(d => d.tier === selectedTier)
                    .map(dungeon => {
                        const tier = dungeon.tier;
                        const mapId = dungeon.reqItem;
                        const mapEntry = inventory[mapId];
                        const mapQty = (mapEntry && typeof mapEntry === 'object') ? (mapEntry.amount || 0) : (Number(mapEntry) || 0);
                        const hasMap = mapQty > 0;

                        const { skills = {} } = gameState?.state || {};
                        const playerIP = avgIP || 0;
                        const reqIP = dungeon.reqIP || 0;

                        const estimatedTimeRun = calculateEstimatedTime(tier, 1);

                        // Possible Loot (Chests with Rarity Chances)
                        const bossMob = MONSTERS[tier]?.find(m => m.id === dungeon.bossId);
                        const lootItems = [
                            { id: `T${tier}_CHEST_NORMAL`, chance: 0.50 },
                            { id: `T${tier}_CHEST_GOOD`, chance: 0.30 },
                            { id: `T${tier}_CHEST_OUTSTANDING`, chance: 0.15 },
                            { id: `T${tier}_CHEST_EXCELLENT`, chance: 0.04 },
                            { id: `T${tier}_CHEST_MASTERPIECE`, chance: 0.01 }
                        ];

                        return (
                            <motion.div
                                key={dungeon.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'relative',
                                    padding: isMobile ? '12px' : '20px',
                                    background: 'var(--panel-bg)',
                                    borderRadius: '12px',
                                    border: `1px solid ${playerIP < reqIP ? 'rgba(255, 68, 68, 0.3)' : 'rgba(174, 0, 255, 0.3)'}`,
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '16px' }}>
                                    {/* Header Info */}
                                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>{dungeon.name}</h3>
                                                <span style={{ fontSize: '0.65rem', background: 'rgba(174, 0, 255, 0.2)', color: '#ae00ff', px: '8px', py: '2px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>Tier {tier}</span>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: isMobile ? '8px' : '16px', color: '#8B8D91', fontSize: isMobile ? '0.7rem' : '0.8rem', marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Sparkles size={14} color="#ffd700" />
                                                    <span>{formatNumber(dungeon.rewards.xp)} XP</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={14} color="#8B8D91" />
                                                    <span>{formatDuration(estimatedTimeRun)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Shield size={14} color={playerIP >= reqIP ? '#4caf50' : '#ff4444'} />
                                                    <span style={{ color: playerIP >= reqIP ? '#4caf50' : '#ff4444', fontWeight: 'bold' }}>IP REQ: {reqIP}</span>
                                                </div>
                                            </div>

                                            {/* Item Power Progress Bar (0-1200) */}
                                            <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '300px', marginBottom: isMobile ? '4px' : '16px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#8B8D91', marginBottom: '20px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    <span>0</span>
                                                    <span>ITEM POWER</span>
                                                    <span>1200</span>
                                                </div>
                                                <div style={{ position: 'relative', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '50px' }}>
                                                    {/* Player Progress Fill with fixed multi-color gradient */}
                                                    {(() => {
                                                        const percentage = Math.min(100, (playerIP / 1200) * 100);
                                                        const stopYellow = ((reqIP * 0.7) / 1200) * 100;
                                                        const stopGreen = (reqIP / 1200) * 100;

                                                        // Fixed gradient that maps to the full 1200 IP width
                                                        const fullGradient = `linear-gradient(90deg, 
                                                            hsl(0, 80%, 50%) 0%, 
                                                            hsl(40, 80%, 50%) ${stopYellow}%, 
                                                            hsl(60, 80%, 55%) ${stopGreen - 1}%, 
                                                            hsl(120, 80%, 50%) ${stopGreen}%, 
                                                            hsl(120, 80%, 20%) 100%)`;

                                                        return (
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${percentage}%` }}
                                                                style={{
                                                                    height: '100%',
                                                                    background: fullGradient,
                                                                    // This ensures the gradient doesn't stretch, but reveals itself
                                                                    backgroundSize: `${percentage > 0 ? (100 / percentage) * 100 : 100}% 100%`,
                                                                    boxShadow: `0 0 10px rgba(255, 255, 255, 0.1)`
                                                                }}
                                                            />
                                                        );
                                                    })()}

                                                    {/* Requirement (CAP) Marker and Label */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${Math.min(100, (reqIP / 1200) * 100)}%`,
                                                        top: -4,
                                                        height: '16px',
                                                        width: '2px',
                                                        background: '#fff',
                                                        zIndex: 3,
                                                        boxShadow: '0 0 6px #fff',
                                                        transform: 'translateX(-50%)'
                                                    }}>
                                                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.65rem', color: '#fff', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                            {reqIP}
                                                        </div>
                                                    </div>

                                                    {/* Current IP Marker and Label */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${Math.min(100, (playerIP / 1200) * 100)}%`,
                                                        top: -4,
                                                        height: '16px',
                                                        width: '2px',
                                                        background: playerIP >= reqIP ? '#4caf50' : '#ff4444',
                                                        zIndex: 4,
                                                        boxShadow: `0 0 8px ${playerIP >= reqIP ? '#4caf50' : '#ff4444'}`,
                                                        transform: 'translateX(-50%)'
                                                    }}>
                                                        <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.7rem', color: playerIP >= reqIP ? '#4caf50' : '#ff4444', fontWeight: '900', textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                                            {playerIP}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleEnterClick(tier)}
                                            style={{
                                                padding: isMobile ? '10px 16px' : '8px 20px',
                                                borderRadius: '8px',
                                                fontSize: isMobile ? '0.8rem' : '0.85rem',
                                                fontWeight: '700',
                                                width: isMobile ? '100%' : '110px',
                                                cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #ae00ff 0%, #7a00cc 100%)',
                                                color: '#fff',
                                                border: 'none',
                                                transition: '0.2s',
                                                boxShadow: '0 4px 12px rgba(174, 0, 255, 0.3)'
                                            }}
                                        >
                                            ENTER
                                        </button>
                                    </div>

                                    {/* Requirements Section */}
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8B8D91', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Required Items</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {/* Map Ticket */}
                                            <div style={{ position: 'relative', width: '52px', height: '52px', background: 'var(--bg-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--slot-bg)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: hasMap ? '#4caf50' : '#ff4444', fontWeight: 'bold', zIndex: 2 }}>
                                                    {formatNumber(mapQty)}/1
                                                </div>
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                    {(() => {
                                                        const item = resolveItem(mapId);
                                                        return item?.icon ? (
                                                            <img src={item.icon} alt={item.name} style={{ width: '120%', height: '120%', objectFit: 'contain' }} />
                                                        ) : (
                                                            <MapIcon size={28} color="var(--text-dim)" />
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Food Requirement */}
                                            {(() => {
                                                const inv = gameState?.state?.inventory || {};
                                                const equippedFood = gameState?.state?.equipment?.food;

                                                // Determine which food to show: priority to equipped, then highest tier in inventory
                                                let bestFoodTier = equippedFood?.tier || null;
                                                let bestFoodQty = equippedFood?.amount || 0;
                                                let source = 'EQUIPPED';

                                                if (!bestFoodTier || bestFoodQty < getFoodCost(tier, bestFoodTier, playerIP)) {
                                                    // Find best in inventory
                                                    for (let ft = 10; ft >= 1; ft--) {
                                                        const id = `T${ft}_FOOD`;
                                                        if (inv[id]) {
                                                            const qty = typeof inv[id] === 'object' ? inv[id].amount : inv[id];
                                                            if (qty > 0) {
                                                                bestFoodTier = ft;
                                                                bestFoodQty = qty;
                                                                source = 'INVENTORY';
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }

                                                // Fallback to T1 if none found to show requirement
                                                const displayTier = bestFoodTier || 1;
                                                const cost = getFoodCost(selectedTier, displayTier, playerIP);
                                                const hasEnough = bestFoodQty >= cost;

                                                return (
                                                    <div style={{ position: 'relative', width: '52px', height: '52px', background: 'var(--bg-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                                        <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--slot-bg)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: hasEnough ? '#4caf50' : '#ff4444', fontWeight: 'bold', zIndex: 2 }}>
                                                            {formatNumber(bestFoodQty)}/{cost}
                                                        </div>
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: bestFoodTier ? 1 : 0.4 }}>
                                                            <div style={{ padding: '4px', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <img src={`/items/T${displayTier}_FOOD.webp`} alt="Food" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            </div>
                                                        </div>
                                                        {source === 'EQUIPPED' && bestFoodTier && (
                                                            <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', background: '#4a90e2', color: '#fff', fontSize: '0.5rem', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>
                                                                EQP
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Silver Cost (if any, showing reward silver for now) */}
                                            <div style={{ position: 'relative', width: '52px', height: '52px', background: 'var(--bg-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                                <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--slot-bg)', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--accent)', fontWeight: 'bold', zIndex: 2 }}>
                                                    {formatNumber(dungeon.entrySilver)}
                                                </div>
                                                <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                                                    <Coins size={28} color="var(--accent)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rooms Section Removed */}

                                    {/* Loot Section */}
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#8B8D91', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Possible Loot</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {lootItems.map((loot, idx) => {
                                                const item = resolveItem(loot.id);
                                                const borderColor = item?.rarityColor || '#3D4255';

                                                return (
                                                    <div
                                                        key={`${loot.id}-${idx}`}
                                                        title={`${item?.name || loot.id.replace(/_/g, ' ')} (${(loot.chance * 100).toFixed(0)}%)`}
                                                        onClick={() => item && setSelectedLootItem({ item: { ...item, id: loot.id } })}
                                                        style={{
                                                            width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden',
                                                            border: `1px solid ${borderColor}`,
                                                            boxShadow: `0 0 5px ${borderColor}20`,
                                                            background: 'var(--slot-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            position: 'relative',
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.1s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                    >
                                                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                            {item?.icon ? (
                                                                <img src={item.icon} alt={item.name} style={{ width: item.scale || '120%', height: item.scale || '120%', objectFit: 'contain' }} />
                                                            ) : (
                                                                <Package size={20} color={borderColor} />
                                                            )}
                                                        </div>
                                                        <div style={{
                                                            position: 'absolute', bottom: 0, right: 0,
                                                            background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.55rem',
                                                            padding: '1px 3px', borderTopLeftRadius: '4px', fontWeight: '900'
                                                        }}>
                                                            {(loot.chance * 100).toFixed(0)}%
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                {/* Bottom Spacer for Scroll */}
                <div style={{ height: '80px', flexShrink: 0 }}></div>
            </div>
            {modals}

            {/* Item Info Modal */}
            <AnimatePresence>
                {selectedLootItem && (
                    <ItemInfoModal
                        item={selectedLootItem.item}
                        onClose={() => setSelectedLootItem(null)}
                        source="Dungeon Loot"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DungeonPanel;
