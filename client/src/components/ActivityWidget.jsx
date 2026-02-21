import React, { useState, useEffect, useMemo } from 'react';
import { Play, CheckCircle, Clock, Square, Zap, Hammer, Pickaxe, Box, Loader, Hourglass, Sword, Skull, Heart, Apple, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveItem, formatItemId } from '@shared/items';
import { MONSTERS } from '@shared/monsters';
import { formatNumber } from '@utils/format';
import { calculateSurvivalTime } from '../utils/combat';

const ActivityWidget = ({ gameState, onStop, socket, onNavigate, isMobile, serverTimeOffset = 0, skillProgress = 0 }) => { // Added skillProgress prop
    const [isOpen, setIsOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [combatElapsed, setCombatElapsed] = useState(0);
    const [dungeonElapsed, setDungeonElapsed] = useState(0);
    const [syncedElapsed, setSyncedElapsed] = useState(0);
    const [smoothProgress, setSmoothProgress] = useState(0);
    const [worldBossData, setWorldBossData] = useState(null);
    const [showDungeonAbandonConfirm, setShowDungeonAbandonConfirm] = useState(false);

    const activity = gameState?.current_activity;
    const combat = gameState?.state?.combat;
    const dungeonState = gameState?.dungeon_state || gameState?.state?.dungeon;

    // Derived stats
    const initialQty = activity?.initial_quantity || activity?.actions_remaining || 1;
    const remainingQty = activity?.actions_remaining || 0;

    // Defensive: If initial_quantity is 0 or missing but we have progress in syncedElapsed,
    // don't let initialQty be smaller than what's already done.
    const effectiveInitialQty = Math.max(initialQty, remainingQty + Math.floor(syncedElapsed / (activity?.time_per_action || 3)));

    const doneQty = Math.max(0, effectiveInitialQty - remainingQty);
    const timePerAction = activity?.time_per_action || 3;

    // Cálculo de Stats (Replicado do ProfilePanel para consistência)
    const stats = useMemo(() => {
        return gameState?.calculatedStats || { hp: 100, damage: 5, attackSpeed: 1000, defense: 0 };
    }, [gameState?.calculatedStats]);

    // Timer para Atividade (Legacy/Fallback)
    useEffect(() => {
        if (!activity || !gameState?.activity_started_at) return;
        const interval = setInterval(() => {
            const start = new Date(gameState?.activity_started_at).getTime();
            const now = Date.now() + serverTimeOffset;
            setElapsed((now - start) / 1000);
        }, 100);
        return () => clearInterval(interval);
    }, [activity?.item_id, activity?.next_action_at, gameState?.activity_started_at, serverTimeOffset]);

    // Timer para Combate

    // Timer para Combate
    useEffect(() => {
        if (!combat) return;
        const startTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();

        // Update immediately to avoid delay
        setCombatElapsed(Math.floor((Date.now() - startTime) / 1000));

        const interval = setInterval(() => {
            setCombatElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [combat?.started_at, !!combat]); // Only restart if started_at changes or combat toggles

    // Timer para Dungeon
    useEffect(() => {
        if (!dungeonState || !dungeonState.active) return;
        const startTime = dungeonState.started_at ? new Date(dungeonState.started_at).getTime() : Date.now();

        setDungeonElapsed(Math.floor((Date.now() - startTime) / 1000));

        const interval = setInterval(() => {
            setDungeonElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [dungeonState?.started_at, !!dungeonState]);

    // Accurate Time Calculation using next_action_at
    useEffect(() => {
        if (!activity) return;

        const updateTimer = () => {
            const now = Date.now() + serverTimeOffset;
            const initialQty = activity.initial_quantity || activity.actions_remaining || 1;
            const remainingQty = activity.actions_remaining;
            const doneQty = Math.max(0, initialQty - remainingQty);
            const timePerAction = activity.time_per_action || 3;

            let currentItemProgressMs = 0;

            if (activity.next_action_at) {
                const endTime = new Date(activity.next_action_at).getTime();
                const timeRemaining = endTime - now;

                // Invert logic: 0 remaining = full progress on this item
                // Max progress = timePerAction * 1000
                currentItemProgressMs = Math.max(0, Math.min(timePerAction * 1000, (timePerAction * 1000) - timeRemaining));
            }

            const totalMs = (doneQty * timePerAction * 1000) + currentItemProgressMs;
            setSyncedElapsed(totalMs / 1000);
        };

        const interval = setInterval(updateTimer, 50); // 20fps
        updateTimer();

        return () => clearInterval(interval);
    }, [activity?.item_id, activity?.next_action_at, activity?.actions_remaining, serverTimeOffset]);

    // Smooth Progress Animation (60fps)
    useEffect(() => {
        if (!activity?.next_action_at) {
            setSmoothProgress(0);
            return;
        }

        let animationFrameId;

        const updateSmoothProgress = () => {
            const now = Date.now() + serverTimeOffset;
            const endTime = new Date(activity.next_action_at).getTime();
            const durationMs = (activity.time_per_action || 3) * 1000;
            const startTime = endTime - durationMs;

            const rawProgress = ((now - startTime) / durationMs) * 100;
            const progress = Math.max(0, Math.min(100, rawProgress));

            setSmoothProgress(progress);
            animationFrameId = requestAnimationFrame(updateSmoothProgress);
        };

        animationFrameId = requestAnimationFrame(updateSmoothProgress);
        return () => cancelAnimationFrame(animationFrameId);
    }, [activity?.next_action_at, activity?.time_per_action, serverTimeOffset]);

    // Listener para o World Boss
    useEffect(() => {
        if (!socket) return;
        const handleUpdate = (result) => {
            if (result.worldBossUpdate && result.worldBossUpdate.status) {
                setWorldBossData(result.worldBossUpdate);
            }
        };
        socket.on('action_result', handleUpdate);
        return () => socket.off('action_result', handleUpdate);
    }, [socket]);

    // Auto-limpeza do World Boss quando terminar
    useEffect(() => {
        if (worldBossData?.status === 'FINISHED') {
            const timer = setTimeout(() => setWorldBossData(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [worldBossData?.status]);

    // ... keydown handler ...

    if (!activity && !combat && (!dungeonState || !dungeonState.active) && !worldBossData) return null;

    const isGathering = activity?.type === 'GATHERING';
    const isRefining = activity?.type === 'REFINING';
    const isCrafting = activity?.type === 'CRAFTING';

    const totalDuration = effectiveInitialQty * timePerAction;
    const totalProgress = Math.min(100, (syncedElapsed / totalDuration) * 100);
    const remainingSeconds = Math.max(0, totalDuration - syncedElapsed);

    // Skill Badge Progress (Capped 0-100)
    // Calculate based on the fraction of the current action completed
    const currentActionProgressPercent = activity?.next_action_at
        ? Math.max(0, Math.min(100, ((timePerAction * 1000) - (new Date(activity.next_action_at).getTime() - (Date.now() + serverTimeOffset))) / (timePerAction * 10)))
        : 0;

    const skillProgressCapped = smoothProgress;
    // Formatar Tempo (HH:MM:SS)
    const formatTime = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s} `;
    };

    const getActivityIcon = () => {
        if (isGathering) return <Pickaxe size={24} color="var(--accent)" />;
        if (isRefining) return <Box size={24} color="var(--accent)" />;
        if (isCrafting) return <Hammer size={24} color="var(--accent)" />;
        return <Zap size={24} color="var(--accent)" />;
    };

    const getActionName = () => {
        if (isGathering) return 'GATHERING';
        if (isRefining) return 'REFINING';
        if (isCrafting) return 'CRAFTING';
        return 'WORKING';
    };

    const stopCombat = () => {
        if (socket) socket.emit('stop_combat');
        setIsOpen(false);
    };

    return (
        <>
            {/* Botão Flutuante Pulsante */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: isMobile ? '80px' : '30px',
                    right: isMobile ? '20px' : '30px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: (combat || (dungeonState?.active) || worldBossData) ? 'rgba(50, 10, 10, 0.95)' : 'var(--panel-bg)',
                    opacity: 0.9,
                    border: (combat || (dungeonState?.active) || worldBossData) ? '1px solid #ff4444' : '1px solid var(--border-active)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--panel-shadow)',
                    zIndex: 1000,
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    backdropFilter: 'blur(10px)',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    {/* LOGICA DE ICONE CORRIGIDA: Split View ou Single View */}
                    {(() => {
                        const isCombat = combat && (combat.mobId || combat.active);
                        const isActivity = !!activity;
                        const isDungeon = dungeonState?.active;
                        const isMultitasking = isCombat && isActivity;

                        // Helper para renderizar Mob Icon
                        const renderMobIcon = () => {
                            const tier = Number(combat.tier) || 1;
                            const mobId = combat.mobId;
                            const mob = MONSTERS[tier]?.find(m => m.id === mobId);
                            if (mob && mob.image) {
                                return <img src={`/monsters/${mob.image}?v=2`} alt={mob.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
                            }
                            return <Skull size={20} color="#ff4444" />;
                        };

                        // Helper para renderizar Activity Icon
                        const renderActivityIcon = () => {
                            const item = resolveItem(activity?.item_id);
                            if (item?.icon) return <img src={item.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />;
                            return getActivityIcon();
                        };

                        if (isMultitasking) {
                            return (
                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>

                                    {/* Metade Superior-Esquerda: Combate */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '2px',
                                        left: '2px',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2
                                    }}>
                                        {renderMobIcon()}
                                    </div>
                                    {/* Metade Inferior-Direita: Atividade */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '2px',
                                        right: '2px',
                                        width: '30px',
                                        height: '30px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 2
                                    }}>
                                        {renderActivityIcon()}
                                    </div>
                                </div>
                            );
                        }

                        // Single Views
                        if (isCombat) {
                            return (
                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {renderMobIcon()}
                                </div>
                            );
                        }

                        if (isDungeon) {
                            return <Skull size={24} color="#ae00ff" />;
                        }

                        if (isActivity) {
                            return (
                                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {renderActivityIcon()}
                                </div>
                            );
                        }

                        return null;
                    })()}

                    {/* Efeito de Pulso (APENAS O ANEL) */}
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: (combat || (dungeonState?.active) || worldBossData) ? 0.8 : 2 }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            boxShadow: (combat || (dungeonState?.active) || worldBossData) ? '0 0 20px rgba(255, 68, 68, 0.4)' : '0 0 15px var(--accent-soft)',
                            pointerEvents: 'none'
                        }}
                    />

                </div>
            </button>

            {/* Container dos Cards */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }}
                            onClick={() => setIsOpen(false)}
                        />
                        <div style={{
                            position: 'fixed',
                            bottom: isMobile ? '160px' : '110px',
                            right: isMobile ? '20px' : '30px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            zIndex: 1001,
                            alignItems: 'flex-end', // Alinha à direita
                            transition: '0.2s',
                            opacity: 1,
                            pointerEvents: 'auto'
                        }}>

                            {/* --- CARD DE ATIVIDADE (Se houver) --- */}
                            {activity && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => onNavigate && onNavigate(activity.item_id)}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'var(--panel-bg)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid var(--border-active)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: 'var(--panel-shadow)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Activity */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'var(--accent-soft)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid var(--border-active)'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: isRefining || isCrafting ? 360 : 0, y: isGathering ? [0, -2, 0] : 0 }}
                                                    transition={{ repeat: Infinity, duration: isGathering ? 0.5 : 2, ease: "linear" }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                                                >
                                                    {(() => {
                                                        const item = resolveItem(activity?.item_id);
                                                        if (item?.icon) return <img src={item.icon} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="" />;
                                                        return React.cloneElement(getActivityIcon(), { size: 18 });
                                                    })()}
                                                </motion.div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: '900', letterSpacing: '0.5px' }}>CURRENT ACTIVITY</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '900' }}>{getActionName()}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>ELAPSED</div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
                                                {formatTime(syncedElapsed)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Activity */}
                                    <div style={{
                                        background: 'var(--slot-bg)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                                {(() => {
                                                    const item = resolveItem(activity.item_id);
                                                    if (item) {
                                                        return `T${item.tier} ${item.name}`;
                                                    }

                                                    // Fallback: try to extract tier from ID (e.g. T2_FISH)
                                                    const match = activity.item_id?.match(/^T(\d+)_/);
                                                    const tierPart = match ? `T${match[1]} ` : '';
                                                    const namePart = formatItemId(activity.item_id);

                                                    return formatItemId(activity.item_id) || 'Unknown Item';
                                                })()}
                                            </span>
                                            <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '0.8rem' }}>{doneQty} <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>/ {effectiveInitialQty}</span></span>
                                        </div>

                                        <div style={{ height: '8px', background: 'var(--accent-soft)', borderRadius: '4px', overflow: 'hidden', position: 'relative', marginBottom: '8px' }}>
                                            <div style={{
                                                width: `${totalProgress}%`,
                                                height: '100%',
                                                background: 'var(--accent)',
                                                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 0 10px var(--accent-soft)'
                                            }} />
                                        </div>

                                        {/* Barra de Progresso da Ação Atual */}
                                        <div style={{ marginBottom: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '2px' }}>
                                                <span>Action Progress</span>
                                                <span>{Math.round(smoothProgress)}%</span>
                                            </div>
                                            <div style={{ height: '4px', background: 'var(--slot-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${smoothProgress}%`,
                                                    height: '100%',
                                                    background: '#4caf50',
                                                    transition: 'width 0.05s linear', // Faster transition for 60fps
                                                    boxShadow: '0 0 5px rgba(76, 175, 80, 0.4)'
                                                }} />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
                                            <span>{doneQty} completed</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Hourglass size={8} /> ~{formatTime(remainingSeconds)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onStop) onStop(); // Use onStop prop from App.jsx
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'var(--accent)',
                                            color: 'var(--panel-bg)',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: '0.2s',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <Square size={14} fill="currentColor" />
                                        STOP
                                    </button>
                                </motion.div>
                            )}

                            {/* --- CARD DE COMBATE (Se houver) --- */}
                            {combat && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => {
                                        if (onNavigate) {
                                            onNavigate('combat');
                                            setIsOpen(false); // Close widget on navigation
                                        }
                                    }}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(20, 10, 10, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 68, 68, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Combat */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(255, 68, 68, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255, 68, 68, 0.3)',
                                                position: 'relative'
                                            }}>
                                                <motion.div
                                                    animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
                                                    transition={{ repeat: Infinity, duration: 1 }}
                                                >
                                                    <Sword size={18} color="#ff4444" />
                                                </motion.div>
                                                {gameState?.state?.equipment?.food?.amount > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#ff4d4d', color: '#fff', fontSize: '0.45rem',
                                                        fontWeight: '900', padding: '1px 3px', borderRadius: '3px',
                                                        border: '1px solid rgba(255,255,255,0.2)'
                                                    }}>
                                                        x{(() => {
                                                            const amt = gameState.state.equipment.food.amount;
                                                            return typeof amt === 'object' ? (amt.amount || 0) : (Number(amt) || 0);
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: '900', letterSpacing: '0.5px', display: 'flex', gap: '8px' }}>
                                                    <span>ACTIVE COMBAT</span>
                                                    {combat.kills > 0 && <span style={{ color: '#fff' }}>• {combat.kills} KILLS</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#ff4444', fontWeight: '900' }}>{combat.mobName}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '15px' }}>
                                            {/* Survival Estimator */}
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: 'bold' }}>SURVIVAL</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {(() => {
                                                        const tier = combat.tier || 1;
                                                        const activeMob = (MONSTERS[tier] || []).find(m => m.id === combat.mobId);

                                                        const survival = calculateSurvivalTime(
                                                            stats,
                                                            activeMob,
                                                            gameState?.state?.equipment?.food ? resolveItem(gameState.state.equipment.food.id) : null,
                                                            gameState?.state?.equipment?.food?.amount || 0,
                                                            combat.playerHealth || 1,
                                                            gameState?.state?.isPremium || gameState?.state?.membership?.active
                                                        );

                                                        return (
                                                            <span style={{ color: survival.color }}>
                                                                {survival.text}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff8888', fontWeight: 'bold' }}>DURATION</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {formatTime(combatElapsed)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Combat */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid rgba(255, 68, 68, 0.1)'
                                    }}>
                                        {/* Barra HP Mob */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#ff4444', fontWeight: 'bold' }}>Enemy</span>
                                                <div style={{ fontSize: '0.7rem', color: '#fff', fontVariantNumeric: 'tabular-nums', display: 'flex', gap: '2px' }}>
                                                    <span style={{ minWidth: '35px', textAlign: 'right' }}>{Math.ceil(combat.mobHealth)}</span>
                                                    <span>/</span>
                                                    <span style={{ minWidth: '35px', textAlign: 'left' }}>{Math.ceil(combat.mobMaxHealth)}</span>
                                                    <span style={{ marginLeft: '2px' }}>HP</span>
                                                </div>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${(combat.mobHealth / combat.mobMaxHealth) * 100}% `,
                                                    height: '100%',
                                                    background: '#ff4444',
                                                    transition: 'width 0.2s'
                                                }} />
                                            </div>
                                        </div>

                                        {/* Barra HP Player */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#4caf50', fontWeight: 'bold' }}>You</span>
                                                <div style={{ fontSize: '0.7rem', color: '#fff', fontVariantNumeric: 'tabular-nums', display: 'flex', gap: '2px' }}>
                                                    <span style={{ minWidth: '35px', textAlign: 'right' }}>{Math.ceil(combat.playerHealth)}</span>
                                                    <span>/</span>
                                                    <span style={{ minWidth: '35px', textAlign: 'left' }}>{Math.ceil(stats.maxHP || stats.hp)}</span>
                                                    <span style={{ marginLeft: '2px' }}>HP</span>
                                                </div>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min(100, (combat.playerHealth / (stats.maxHP || stats.hp || 100)) * 100)}% `,
                                                    height: '100%',
                                                    background: '#4caf50',
                                                    transition: 'width 0.2s'
                                                }} />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={stopCombat}
                                        style={{
                                            width: '100%',
                                            background: '#ff4444',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: '0.2s',
                                            boxShadow: '0 4px 12px rgba(255, 68, 68, 0.3)'
                                        }}
                                    >
                                        <Skull size={14} />
                                        FLEE
                                    </button>
                                </motion.div>
                            )}

                            {/* --- CARD DE DUNGEON (Se houver) --- */}
                            {(dungeonState && dungeonState.active) && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => {
                                        if (onNavigate) {
                                            onNavigate('dungeon');
                                            setIsOpen(false);
                                        }
                                    }}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(20, 10, 30, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(174, 0, 255, 0.3)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                                        overflow: 'hidden',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {/* Header Dungeon */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(174, 0, 255, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(174, 0, 255, 0.3)',
                                            }}>
                                                <Skull size={24} color={dungeonState.status === 'BOSS_FIGHT' ? '#ff4444' : '#ae00ff'} />
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: '900' }}>T{dungeonState.tier} DUNGEON</div>
                                                <div style={{ color: dungeonState.status === 'BOSS_FIGHT' ? '#ff4444' : '#ae00ff', fontSize: '0.65rem', fontWeight: 'bold' }}>{dungeonState.status}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', gap: '15px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#aaa', fontWeight: 'bold' }}>DURATION</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {formatTime(dungeonElapsed)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#aaa', fontWeight: 'bold' }}>WAVE</div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                                    {dungeonState.wave}/{dungeonState.maxWaves}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Dungeon */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '6px',
                                        padding: '8px',
                                        marginBottom: '10px',
                                        border: '1px solid rgba(174, 0, 255, 0.1)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#ae00ff', fontWeight: 'bold' }}>
                                                {dungeonState.status === 'WALKING' ? "Walking..." :
                                                    dungeonState.status === 'FIGHTING' ? `Fighting... (${formatNumber(dungeonState.activeMob?.health || 0)}/${formatNumber(dungeonState.activeMob?.maxHealth || 0)})` :
                                                        dungeonState.status === 'BOSS_FIGHT' ? `BOSS FIGHT (${formatNumber(dungeonState.activeMob?.health || 0)}/${formatNumber(dungeonState.activeMob?.maxHealth || 0)})` :
                                                            dungeonState.status}
                                            </span>
                                            {dungeonState.repeatCount > 0 && !dungeonState.stopping && (
                                                <span style={{ fontSize: '0.7rem', color: '#aaa' }}>
                                                    {(() => {
                                                        let total, current;
                                                        if (dungeonState.initialRepeats !== undefined) {
                                                            total = dungeonState.initialRepeats + 1;
                                                            current = total - dungeonState.repeatCount;
                                                        } else {
                                                            // Fallback
                                                            const completed = (dungeonState.lootLog || []).length;
                                                            const remaining = dungeonState.repeatCount || 0;
                                                            total = completed + 1 + remaining;
                                                            current = completed + 1;
                                                        }
                                                        return `RUN: ${current}/${total}`;
                                                    })()}
                                                </span>
                                            )}
                                            {dungeonState.stopping && (
                                                <span style={{ fontSize: '0.65rem', color: '#ff9800', fontWeight: '900', animation: 'pulse 1.5s infinite', background: 'rgba(255, 152, 0, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                                                    STOPPING AFTER RUN
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (dungeonState.status === 'COMPLETED') {
                                                if (socket) socket.emit('stop_dungeon');
                                            } else {
                                                setShowDungeonAbandonConfirm(true);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            background: dungeonState.status === 'COMPLETED' ? '#4caf50' : '#ff4444',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            letterSpacing: '1px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            transition: '0.2s',
                                            boxShadow: dungeonState.status === 'COMPLETED' ? '0 4px 12px rgba(76, 175, 80, 0.3)' : '0 4px 12px rgba(255, 68, 68, 0.3)',
                                            opacity: 1,
                                            pointerEvents: 'auto'
                                        }}
                                    >
                                        <Skull size={14} />
                                        {dungeonState.status === 'COMPLETED' ? "CLAIM & EXIT" : dungeonState.stopping ? "STOPPING..." : "ABANDON"}
                                    </button>
                                </motion.div>
                            )}

                            {/* --- CARD DO WORLD BOSS (Se houver) --- */}
                            {worldBossData && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                                    onClick={() => {
                                        if (onNavigate) {
                                            onNavigate('world_boss');
                                            setIsOpen(false);
                                        }
                                    }}
                                    style={{
                                        width: '280px',
                                        maxWidth: 'calc(100vw - 60px)',
                                        background: 'rgba(30, 0, 0, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(255, 77, 77, 0.4)',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        boxShadow: '0 10px 40px rgba(255, 0, 0, 0.2)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: 'rgba(255, 77, 77, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255, 77, 77, 0.3)'
                                            }}>
                                                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                                                    <Skull size={18} color="#ff4d4d" />
                                                </motion.div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.55rem', color: '#ff4d4d', fontWeight: '900', letterSpacing: '1px' }}>WORLD BOSS</div>
                                                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '900' }}>
                                                    {worldBossData.status === 'FINISHED' ? 'Fight Finished' : 'Active Fight'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '10px', border: '1px solid rgba(255, 77, 77, 0.1)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>DAMAGE</span>
                                            <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>{formatNumber(worldBossData.damage || 0)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#aaa' }}>RANK</span>
                                            <span style={{ fontSize: '0.9rem', color: '#ffd700', fontWeight: '900' }}>#{worldBossData.rankingPos || '--'}</span>
                                        </div>

                                        {/* Progress Bar for Time Remaining (60s limit) */}
                                        <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: '0%' }}
                                                animate={{ width: `${Math.min(100, ((worldBossData.elapsed || 0) / 60000) * 100)}%` }}
                                                style={{ height: '100%', background: '#ff4d4d', boxShadow: '0 0 10px rgba(255, 77, 77, 0.5)' }}
                                            />
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '0.6rem', color: '#ff4d4d', marginTop: '4px', fontWeight: 'bold' }}>
                                            {Math.max(0, 60 - Math.floor((worldBossData.elapsed || 0) / 1000))}s REMAINING
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (socket) socket.emit('stop_world_boss');
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            background: '#ff4d4d',
                                            color: '#fff',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: '900',
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 15px rgba(255, 77, 77, 0.3)'
                                        }}
                                    >
                                        <X size={14} />
                                        {worldBossData.status === 'FINISHED' ? "EXIT" : "ABANDON"}
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* --- CAIXA INFORMATIVA MULTITAREFA (Posicionamento Fixo Exato) --- */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{
                                position: 'fixed',
                                bottom: isMobile ? '80px' : '30px',
                                right: isMobile ? '95px' : '105px',
                                width: '205px',
                                background: 'var(--panel-bg)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid var(--border-active)',
                                borderRadius: '12px',
                                padding: '12px',
                                color: 'var(--text-main)',
                                fontSize: '0.75rem',
                                zIndex: 1001,
                                boxShadow: 'rgba(0, 0, 0, 0.7) 0px 10px 40px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: 'var(--accent-soft)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--accent)',
                                fontWeight: 'bold'
                            }}>i</div>
                            <div style={{ lineHeight: '1.4', flex: '1 1 0%' }}>
                                You can perform a <b>gathering</b> and a <b>combat</b> action at the same time.
                            </div>
                        </motion.div>

                    </>
                )
                }
            </AnimatePresence>

            {/* Custom Abandon Confirmation Modal for Dungeon */}
            {showDungeonAbandonConfirm && (
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
                                    if (socket) socket.emit('stop_dungeon_queue');
                                    setShowDungeonAbandonConfirm(false);
                                    setIsOpen(false);
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
                                    if (socket) socket.emit('stop_dungeon');
                                    setShowDungeonAbandonConfirm(false);
                                    setIsOpen(false);
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
                            onClick={() => setShowDungeonAbandonConfirm(false)}
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
        </>
    );
};

export default ActivityWidget;
