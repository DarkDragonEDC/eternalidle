import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Flame, Heart, Coins, Shield, AlertTriangle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '@utils/format';
import { SKILL_DESCRIPTIONS } from '@shared/skill_descriptions';

const RestPanel = ({ gameState, isMobile, socket }) => {
    const [selectedPercent, setSelectedPercent] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [healResult, setHealResult] = useState(null);
    const [now, setNow] = useState(Date.now());

    // Tick every 200ms for smooth progress while resting
    const resting = gameState?.state?.resting;
    useEffect(() => {
        if (!resting) return;
        const interval = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(interval);
    }, [resting]);

    const stats = gameState?.calculatedStats || {};
    const currentHp = Math.ceil(gameState?.state?.health || 0);
    const maxHp = Math.ceil(stats.maxHP || stats.hp || 100);
    const missingHp = Math.max(0, maxHp - currentHp);
    const hpPercent = maxHp > 0 ? Math.min(100, (currentHp / maxHp) * 100) : 100;

    const inCombat = !!(gameState?.state?.combat);
    const inDungeon = !!(gameState?.state?.dungeon?.active || gameState?.dungeon_state?.active);
    const isBlocked = inCombat || inDungeon;
    const isFullHp = missingHp <= 0 && !resting;
    const isResting = !!resting;

    const silver = gameState?.state?.silver || 0;
    const percentOptions = [10, 25, 50, 75, 100];

    const getHealAmount = (pct) => Math.max(0, Math.ceil(maxHp * (pct / 100)) - currentHp);
    const getCost = (pct) => getHealAmount(pct) * 3;
    const canAfford = (pct) => silver >= getCost(pct) && getCost(pct) > 0;
    const getDuration = (pct) => Math.max(1, Math.ceil((getHealAmount(pct) / maxHp) * 100)) * 3;
    const formatTime = (s) => { const m = Math.floor(s / 60); const sec = s % 60; return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`; };

    // Resting progress
    let restProgress = 0;
    let restTimeLeft = 0;
    if (resting) {
        const total = resting.endsAt - resting.startedAt;
        const elapsed = now - resting.startedAt;
        restProgress = Math.min(100, (elapsed / total) * 100);
        restTimeLeft = Math.max(0, Math.ceil((resting.endsAt - now) / 1000));
    }

    const handleHeal = () => {
        if (!selectedPercent || isBlocked || isFullHp || isResting) return;
        const cost = getCost(selectedPercent);
        if (cost > silver || cost <= 0) return;
        if (socket) socket.emit('rest_heal', { percent: selectedPercent });
    };

    const handleCancelRest = () => {
        if (socket) socket.emit('cancel_rest');
    };

    // When resting timer completes, ask server to finalize
    const completedRef = useRef(false);
    useEffect(() => {
        if (resting && restProgress >= 100 && !completedRef.current) {
            completedRef.current = true;
            if (socket) socket.emit('rest_check');
        }
        if (!resting) completedRef.current = false;
    }, [resting, restProgress, socket]);

    const store = useAppStore();
    const { lastActionResult, setLastActionResult } = store;

    // Listen for server errors via centralized store
    useEffect(() => {
        if (!lastActionResult) return;

        const data = lastActionResult;
        if (data.restHealError) {
            setHealResult({ error: data.restHealError });
            setTimeout(() => setHealResult(null), 3000);
            // Clear result after processing
            setLastActionResult(null);
        }
    }, [lastActionResult, setLastActionResult]);

    const hpBarColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: isMobile ? '8px 10px' : '14px 18px',
            gap: isMobile ? '8px' : '10px',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '8px' : '10px',
                paddingBottom: isMobile ? '6px' : '8px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{
                    width: isMobile ? '32px' : '44px',
                    height: isMobile ? '32px' : '44px',
                    borderRadius: isMobile ? '8px' : '12px',
                    background: 'rgba(255, 147, 41, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(255, 147, 41, 0.25)', flexShrink: 0
                }}>
                    <Flame size={isMobile ? 16 : 22} color="#ff9329" />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: isMobile ? '0.85rem' : '1.1rem', fontWeight: '900', color: '#ff9329', margin: 0, letterSpacing: '0.5px' }}>
                            RESTING CAMP
                        </h2>
                        <button 
                            onClick={() => setShowInfo(!showInfo)}
                            style={{
                                background: 'rgba(255, 147, 41, 0.1)',
                                border: '1px solid rgba(255, 147, 41, 0.2)',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: showInfo ? '#ff9329' : 'var(--text-dim)',
                                transition: '0.2s'
                            }}
                        >
                            <Info size={12} />
                        </button>
                    </div>
                    <p style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', color: 'var(--text-dim)', margin: 0 }}>
                        Rest by the fire to heal your wounds
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {showInfo && SKILL_DESCRIPTIONS.CAMP && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ 
                            padding: '12px', 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '10px', 
                            border: '1px solid var(--border)',
                            position: 'relative'
                        }}>
                            <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                                {SKILL_DESCRIPTIONS.CAMP.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                            <button 
                                onClick={() => setShowInfo(false)}
                                style={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Blocked Warning */}
            {isBlocked && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: isMobile ? '8px 10px' : '12px 16px',
                    background: 'rgba(244, 67, 54, 0.08)', borderRadius: '10px',
                    border: '1px solid rgba(244, 67, 54, 0.2)'
                }}>
                    <AlertTriangle size={16} color="#f44336" />
                    <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem', color: '#f44336', fontWeight: '700' }}>
                        {inCombat ? 'Cannot rest during combat! Flee first.' : 'Cannot rest during a dungeon!'}
                    </span>
                </div>
            )}

            {/* HP Bar Section */}
            <div className="glass-panel" style={{
                padding: isMobile ? '10px' : '12px 14px',
                borderRadius: '12px', background: 'var(--accent-soft)',
                border: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '6px' : '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={14} color={hpBarColor} fill={hpBarColor} />
                        <span style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                            HEALTH POINTS
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{
                            fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '900',
                            color: (selectedPercent && getHealAmount(selectedPercent) > 0 && !isResting) ? '#4caf50'
                                : isResting ? '#4caf50' : hpBarColor,
                            transition: 'color 0.3s'
                        }}>
                            {isResting
                                ? formatNumber(currentHp + Math.ceil(resting.healAmount * (restProgress / 100)))
                                : (selectedPercent && getHealAmount(selectedPercent) > 0)
                                    ? formatNumber(currentHp + getHealAmount(selectedPercent))
                                    : formatNumber(currentHp)}
                        </span>
                        <span style={{ fontSize: isMobile ? '0.6rem' : '0.7rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                            / {formatNumber(maxHp)}
                        </span>
                    </div>
                </div>

                {/* HP Bar */}
                <div style={{
                    height: isMobile ? '10px' : '14px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '5px',
                    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
                    position: 'relative'
                }}>
                    <motion.div
                        initial={false}
                        animate={{ width: `${hpPercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        style={{
                            height: '100%',
                            background: `linear-gradient(90deg, ${hpBarColor}, ${hpBarColor}cc)`,
                            borderRadius: '5px', boxShadow: `0 0 12px ${hpBarColor}40`,
                            position: 'relative', zIndex: 2
                        }}
                    >
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                            background: 'rgba(255,255,255,0.15)', borderRadius: '5px 5px 0 0'
                        }} />
                    </motion.div>

                    {/* Green preview bar (selection) */}
                    {selectedPercent && !isResting && getHealAmount(selectedPercent) > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute', top: 0, left: 0, height: '100%',
                                width: `${Math.min(100, hpPercent + ((100 - hpPercent) * (selectedPercent / 100)))}%`,
                                background: 'linear-gradient(90deg, transparent, #4caf50aa)',
                                borderRadius: '5px', zIndex: 1,
                                boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)'
                            }}
                        />
                    )}

                    {/* Healing progress bar (active resting) */}
                    {isResting && (
                        <div style={{
                            position: 'absolute', top: 0, left: 0, height: '100%',
                            width: `${Math.min(100, hpPercent + ((resting.healAmount / maxHp * 100) * (restProgress / 100)))}%`,
                            background: `linear-gradient(90deg, ${hpBarColor}, #4caf50)`,
                            borderRadius: '5px', opacity: 0.8, zIndex: 1,
                            boxShadow: '0 0 15px rgba(76, 175, 80, 0.5)',
                            transition: 'width 0.2s linear'
                        }} />
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: isMobile ? '4px' : '8px' }}>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                        {hpPercent.toFixed(1)}% HP
                    </span>
                    <span style={{ fontSize: '0.6rem', color: missingHp > 0 ? '#f44336' : '#4caf50', fontWeight: '700' }}>
                        {missingHp > 0 && !isResting ? `Missing: ${formatNumber(missingHp)} HP` : isResting ? `Healing...` : 'Full Health!'}
                    </span>
                </div>
            </div>

            {/* Active Resting Panel */}
            {isResting && (
                <div className="glass-panel" style={{
                    padding: isMobile ? '10px' : '14px',
                    borderRadius: '12px', background: 'rgba(76, 175, 80, 0.06)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            >
                                <Flame size={16} color="#ff9329" />
                            </motion.div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4caf50', letterSpacing: '1px' }}>
                                RESTING...
                            </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-main)' }}>
                            {formatTime(restTimeLeft)}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: '6px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${restProgress}%`, height: '100%',
                            background: 'linear-gradient(90deg, #4caf50, #81c784)',
                            borderRadius: '3px', boxShadow: '0 0 10px rgba(76, 175, 80, 0.4)',
                            transition: 'width 0.2s linear'
                        }} />
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <Heart size={12} color="#4caf50" />
                            <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>HEAL</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4caf50' }}>+{formatNumber(resting.healAmount)}</span>
                        </div>
                        <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                            <Coins size={12} color="#fbbf24" />
                            <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>COST</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fbbf24' }}>{formatNumber(resting.cost)}</span>
                        </div>
                    </div>

                    {/* Cancel button */}
                    <button
                        onClick={handleCancelRest}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            padding: '6px', borderRadius: '8px',
                            background: 'rgba(244, 67, 54, 0.08)', border: '1px solid rgba(244, 67, 54, 0.2)',
                            color: '#f44336', fontSize: '0.65rem', fontWeight: '800',
                            cursor: 'pointer', letterSpacing: '0.5px'
                        }}
                    >
                        <X size={12} /> CANCEL & REFUND
                    </button>
                </div>
            )}

            {/* Healing Controls - only when not resting and not full HP */}
            {!isFullHp && !isBlocked && !isResting && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '4px' : '8px' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                            SELECT HEALING AMOUNT
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: isMobile ? '4px' : '6px' }}>
                            {percentOptions.map(pct => {
                                const healAmt = getHealAmount(pct);
                                const affordable = canAfford(pct);
                                const isSelected = selectedPercent === pct;

                                return (
                                    <motion.button
                                        key={pct}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedPercent(pct)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            gap: '2px', padding: isMobile ? '6px 2px' : '10px 4px',
                                            borderRadius: isMobile ? '8px' : '12px',
                                            border: `2px solid ${isSelected ? '#ff9329' : 'var(--border)'}`,
                                            background: isSelected ? '#2a1f0f' : '#1a1a1a',
                                            cursor: 'pointer', transition: '0.2s',
                                            boxShadow: isSelected ? '0 0 15px rgba(255, 147, 41, 0.2)' : 'none'
                                        }}
                                    >
                                        <span style={{
                                            fontSize: isMobile ? '0.75rem' : '0.9rem', fontWeight: '900',
                                            color: isSelected ? '#ff9329' : !affordable ? '#666' : 'var(--text-main)'
                                        }}>
                                            {pct}%
                                        </span>
                                        <span style={{ fontSize: '0.6rem', color: '#4caf50', fontWeight: '700' }}>
                                            +{formatNumber(healAmt)}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    <AnimatePresence>
                        {selectedPercent && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div className="glass-panel" style={{
                                    padding: isMobile ? '8px 10px' : '10px 14px',
                                    borderRadius: '12px', background: 'var(--accent-soft)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: isMobile ? 'row' : 'column',
                                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                                    gap: isMobile ? '0' : '6px',
                                    justifyContent: isMobile ? 'space-between' : 'flex-start'
                                }}>
                                    {isMobile ? (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                                                <Heart size={14} color="#4caf50" />
                                                <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: '600' }}>HEAL</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#4caf50' }}>+{formatNumber(getHealAmount(selectedPercent))}</span>
                                            </div>
                                            <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', margin: '2px 0' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                                                <Coins size={14} color="#fbbf24" />
                                                <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: '600' }}>COST</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: canAfford(selectedPercent) ? '#fbbf24' : '#f44336' }}>{formatNumber(getCost(selectedPercent))}</span>
                                            </div>
                                            <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', margin: '2px 0' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1 }}>
                                                <Shield size={14} color="var(--text-dim)" />
                                                <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: '600' }}>TIME</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatTime(getDuration(selectedPercent))}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px' }}>HEALING SUMMARY</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Heart size={14} color="#4caf50" />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700' }}>HP to Heal</span>
                                                </div>
                                                <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#4caf50' }}>+{formatNumber(getHealAmount(selectedPercent))}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Coins size={14} color="#fbbf24" />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700' }}>Silver Cost</span>
                                                </div>
                                                <span style={{ fontSize: '0.95rem', fontWeight: '900', color: canAfford(selectedPercent) ? '#fbbf24' : '#f44336' }}>{formatNumber(getCost(selectedPercent))}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Shield size={14} color="var(--text-dim)" />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: '700' }}>Duration</span>
                                                </div>
                                                <span style={{ fontSize: '0.95rem', fontWeight: '900', color: 'var(--text-main)' }}>{formatTime(getDuration(selectedPercent))}</span>
                                            </div>
                                            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Your Silver</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fbbf24' }}>{formatNumber(silver)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Heal Button */}
                    <motion.button
                        whileTap={selectedPercent && canAfford(selectedPercent) ? { scale: 0.98 } : {}}
                        onClick={handleHeal}
                        disabled={!selectedPercent || !canAfford(selectedPercent)}
                        style={{
                            width: '100%', padding: isMobile ? '10px' : '14px',
                            borderRadius: '12px',
                            background: (selectedPercent && canAfford(selectedPercent))
                                ? 'linear-gradient(135deg, #ff9329 0%, #e67e22 100%)' : 'var(--slot-bg)',
                            border: (selectedPercent && canAfford(selectedPercent))
                                ? '1px solid #ffaa44' : '1px solid var(--border)',
                            color: (selectedPercent && canAfford(selectedPercent)) ? '#000' : 'var(--text-dim)',
                            fontWeight: '900', fontSize: isMobile ? '0.75rem' : '0.9rem',
                            letterSpacing: '1px',
                            cursor: (!selectedPercent || !canAfford(selectedPercent)) ? 'not-allowed' : 'pointer',
                            opacity: !selectedPercent ? 0.5 : 1,
                            boxShadow: (selectedPercent && canAfford(selectedPercent))
                                ? '0 6px 25px rgba(255, 147, 41, 0.35)' : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', textTransform: 'uppercase'
                        }}
                    >
                        <Flame size={16} />
                        {selectedPercent
                            ? (canAfford(selectedPercent) ? `REST & HEAL (${formatNumber(getCost(selectedPercent))} Silver)` : 'NOT ENOUGH SILVER')
                            : 'SELECT AMOUNT'}
                    </motion.button>
                </>
            )}

            {/* Full HP message */}
            {isFullHp && !isBlocked && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '8px', padding: isMobile ? '20px 16px' : '30px 20px', textAlign: 'center'
                }}>
                    <Heart size={28} color="#4caf50" fill="#4caf50" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#4caf50' }}>You are at full health!</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>No healing needed. Go fight some monsters!</span>
                </div>
            )}

            {/* Error Toast */}
            <AnimatePresence>
                {healResult && healResult.error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                            padding: isMobile ? '8px 10px' : '14px 16px',
                            borderRadius: '10px', background: 'rgba(244, 67, 54, 0.1)',
                            border: '1px solid rgba(244, 67, 54, 0.3)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <AlertTriangle size={16} color="#f44336" />
                        <span style={{ fontSize: '0.75rem', color: '#f44336', fontWeight: '700' }}>{healResult.error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RestPanel;
