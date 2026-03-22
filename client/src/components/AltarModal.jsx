import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Coins, Clock, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatNumber, formatSilver } from '../utils/format';

export const AltarModal = ({ isOpen, onClose }) => {
    const { socket, gameState, altarState, setAltarState } = useAppStore();
    const [amount, setAmount] = useState('');
    const [isDonating, setIsDonating] = useState(false);
    const [activatingTier, setActivatingTier] = useState(null);
    const [error, setError] = useState(null);
    const [expandedTiers, setExpandedTiers] = useState({});

    // Initial fetch when opened
    useEffect(() => {
        if (isOpen && socket) {
            socket.emit('altar_get', {}, (res) => {
                if (res.error) setError(res.error);
                else setAltarState(res);
            });
        }
    }, [isOpen, socket]);

    // Timer for reset
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        if (!isOpen) return;
        const calcTime = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setUTCHours(24, 0, 0, 0); // Next UTC midnight
            const diff = tomorrow - now;

            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        calcTime();
        const int = setInterval(calcTime, 1000);
        return () => clearInterval(int);
    }, [isOpen]);

    if (!isOpen) return null;

    const globalState = altarState?.global || { totalSilver: 0 };
    const playerState = altarState?.player || { donated: 0 };
    
    // Arrays representing the 3 Tiers
    const tiers = altarState?.tiers || [2000000, 5000000, 10000000];
    const minDonations = altarState?.minDonations || [2000, 5000, 10000];
    const goal = tiers[2] || 10000000; // Maximum progress
    
    const progress = Math.min(100, (globalState.totalSilver / goal) * 100);

    const handleDonate = () => {
        const val = parseInt(amount);
        if (isNaN(val) || val <= 0) {
            setError("Invalid amount");
            return;
        }
        if (val > (gameState?.state?.silver || 0)) {
            setError("Not enough Silver!");
            return;
        }
        setIsDonating(true);
        setError(null);
        socket.emit('altar_donate', { amount: val }, (res) => {
            setIsDonating(false);
            if (res.error) setError(res.error);
            else {
                setAltarState(res);
                setAmount('');
            }
        });
    };

    const handleActivate = (tierIndex) => {
        setActivatingTier(tierIndex);
        setError(null);
        socket.emit('altar_activate', { tier: tierIndex }, (res) => {
            setActivatingTier(null);
            if (res.error) setError(res.error);
            else setAltarState(res);
        });
    };

    const isGoalReached = globalState.totalSilver >= goal;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 6000, padding: '16px'
            }} onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border-active)',
                        borderRadius: '16px',
                        width: '100%', maxWidth: '400px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        position: 'relative'
                    }}
                >
                    {/* Header Compacto */}
                    <div style={{
                        padding: '12px 16px', background: 'linear-gradient(180deg, rgba(234, 88, 12, 0.2) 0%, transparent 100%)',
                        borderBottom: '1px solid rgba(234, 88, 12, 0.15)', textAlign: 'center', position: 'relative'
                    }}>
                        <button onClick={onClose} style={{
                            position: 'absolute', top: '8px', right: '8px', background: 'transparent',
                            border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px'
                        }}>
                            <X size={16} />
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                            <Flame size={20} color={isGoalReached ? "#f97316" : "#fb923c"} style={{
                                filter: isGoalReached ? 'drop-shadow(0 0 8px #f97316)' : 'none'
                            }} />
                            <h2 style={{ fontSize: '1rem', color: '#f97316', margin: 0, fontWeight: '900', letterSpacing: '1px', fontFamily: 'Cinzel, serif' }}>
                                ALTAR OF OFFERINGS
                            </h2>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-main)', opacity: 0.8, marginBottom: '4px' }}>
                            Resets in <span style={{ fontFamily: 'monospace', color: '#fb923c' }}>{timeLeft}</span> UTC
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#fb923c', opacity: 0.9 }}>
                            Rewards (up to 30%, stacks!): Global XP, Silver, Drops, Quality, Auto-Refine & Doubles
                        </div>
                    </div>

                    <div style={{ padding: '12px 16px' }}>
                        {/* Progress Bar Compacted */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>Global Progress</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fb923c', fontFamily: 'monospace' }}>
                                    {formatNumber(globalState.totalSilver)} / {formatNumber(goal)}
                                </span>
                            </div>
                            <div style={{
                                height: '14px', background: 'var(--slot-bg)', borderRadius: '10px',
                                border: '1px solid var(--border)', overflow: 'hidden', position: 'relative'
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, bottom: 0,
                                        background: isGoalReached 
                                            ? 'linear-gradient(90deg, #f97316, #fbbf24)'
                                            : 'linear-gradient(90deg, rgba(234, 88, 12, 0.6), rgba(234, 88, 12, 0.9))',
                                        boxShadow: isGoalReached ? '0 0 10px rgba(234, 88, 12, 0.8)' : 'none'
                                    }}
                                />
                                {/* Render Tier Markers */}
                                {tiers.map((tTarget, index) => {
                                    if (tTarget >= goal) return null; // Last target doesn't need line inside
                                    return (
                                        <div key={index} style={{
                                            position: 'absolute', left: `${(tTarget / goal) * 100}%`,
                                            top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.4)', zIndex: 5,
                                            boxShadow: '0 0 2px rgba(0,0,0,0.5)'
                                        }} />
                                    );
                                })}
                                {isGoalReached && (
                                    <div style={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                                    }}>
                                        GOAL REACHED!
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Compact Player Status & Actions */}
                        <div style={{
                            background: 'var(--slot-bg)', borderRadius: '8px', padding: '8px 10px',
                            border: '1px solid var(--border)', marginBottom: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ fontSize: '0.7rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>You: </span>
                                    <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{formatNumber(playerState.donated || 0)}</span>
                                </div>
                                <div style={{ fontSize: '0.7rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Wallet: </span>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{formatSilver(gameState?.state?.silver || 0)}</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                    type="number"
                                    placeholder="Amount..."
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                    style={{
                                        flex: 1, padding: '6px 8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
                                        borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', fontFamily: 'monospace'
                                    }}
                                />
                                <button
                                    onClick={handleDonate}
                                    disabled={!amount || isDonating || parseInt(amount) <= 0}
                                    style={{
                                        padding: '0 12px', background: 'var(--accent)', color: '#000', fontWeight: 'bold',
                                        border: 'none', borderRadius: '6px', cursor: (!amount || isDonating) ? 'not-allowed' : 'pointer',
                                        opacity: (!amount || isDonating) ? 0.5 : 1, transition: '0.2s', fontSize: '0.8rem'
                                    }}
                                >
                                    {isDonating ? '...' : 'Donate'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.7rem', textAlign: 'center', marginBottom: '10px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                {error}
                            </div>
                        )}

                        {/* Buff Activation Tiers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {[1, 2, 3].map(tier => {
                                        const reqGlobal = tiers[tier - 1];
                                        const reqDonation = minDonations[tier - 1];
                                        const tierKey = `tier${tier}EndTime`;
                                        const endTime = playerState[tierKey];
                                        const isActive = !!endTime && Date.now() < endTime;
                                        const isUsed = !!endTime;
                                        const isGlobalMet = globalState.totalSilver >= reqGlobal;
                                        const isDonationMet = (playerState.donated || 0) >= reqDonation;
                                        const canActivate = isGlobalMet && isDonationMet && !isUsed;

                                        // Calculate potential duration until 00:00 UTC, max 12h
                                        const now = Date.now();
                                        const midnight = new Date();
                                        midnight.setUTCHours(24, 0, 0, 0);
                                        const timeUntilMidnight = midnight.getTime() - now;
                                        const potMs = Math.min(12 * 60 * 60 * 1000, timeUntilMidnight);
                                        const potH = Math.floor(potMs / (3600 * 1000));
                                        const potM = Math.floor((potMs % (3600 * 1000)) / (60 * 1000));
                                        const potText = `${potH}h ${potM}m`;

                                        return (
                                    <div key={tier} style={{
                                        background: isActive ? 'rgba(74, 222, 128, 0.1)' : 'var(--slot-bg)',
                                        border: isActive ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid var(--border)',
                                        borderRadius: '6px', padding: '8px 10px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div 
                                                style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isActive ? '#4ade80' : '#fb923c', marginBottom: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                onClick={() => setExpandedTiers(prev => ({ ...prev, [tier]: !prev[tier] }))}
                                            >
                                                Tier {tier}
                                                <span style={{ marginLeft: '8px', fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '2px', opacity: 0.8 }}>
                                                    {expandedTiers[tier] ? '▲ Hide Buffs' : '▼ Show Buffs'}
                                                </span>
                                            </div>
                                            {expandedTiers[tier] && (
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.9 }}>
                                                    <div>• +{tier === 1 ? '5' : tier === 2 ? '10' : '15'}% XP & Silver Find</div>
                                                    <div>• +{tier === 1 ? '2.5' : tier === 2 ? '5' : '10'}% Auto Refine & Double</div>
                                                    <div>• +{tier === 1 ? '2.5' : tier === 2 ? '5' : '10'}% Drop & Quality Chance</div>
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '6px', borderTop: '1px dotted rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                                                Req: {(reqGlobal/1000000)}M Global / {formatNumber(reqDonation)} You
                                            </div>
                                        </div>
                                        <div>
                                            {isActive ? (
                                                <div style={{ fontSize: '0.7rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                                    <Sparkles size={10} /> 
                                                    {(() => {
                                                        const rem = Math.max(0, endTime - Date.now());
                                                        const h = Math.floor(rem / 3600000);
                                                        const m = Math.floor((rem % 3600000) / 60000);
                                                        const s = Math.floor((rem % 60000) / 1000);
                                                        return `Ends in ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                                                    })()}
                                                </div>
                                            ) : isUsed ? (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 }}>
                                                    Already Used Today
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <button
                                                        onClick={() => handleActivate(tier)}
                                                        disabled={!canActivate || activatingTier === tier}
                                                        style={{
                                                            padding: '4px 12px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '4px',
                                                            background: canActivate ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' : 'rgba(0,0,0,0.3)',
                                                            color: canActivate ? '#fff' : 'var(--text-dim)', border: 'none',
                                                            cursor: canActivate && activatingTier !== tier ? 'pointer' : 'not-allowed',
                                                            opacity: activatingTier === tier || !canActivate ? 0.6 : 1, transition: '0.2s',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        {activatingTier === tier ? '...' : (isGlobalMet ? 'Activate' : 'Locked')}
                                                    </button>
                                                    {isGlobalMet && (
                                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', opacity: 0.8, fontWeight: 'bold' }}>
                                                            {potText} buff
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
