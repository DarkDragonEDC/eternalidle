import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatNumber, formatSilver, formatCompactNumber } from '@utils/format';
import { Sword, Shield, Skull, Coins, Zap, Clock, Trophy, ChevronRight, User, Terminal, Activity, TrendingUp, Star, Apple, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MONSTERS } from '@shared/monsters';
import { resolveItem } from '@shared/items';
import { calculateSurvivalTime } from '../utils/combat';

const AnimatedCounter = ({ value, maxValue, triggerKey }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        // Reset to Max on trigger (Kill)
        setDisplayValue(maxValue);
        // Small delay then drop to target
        const timer = setTimeout(() => {
            setDisplayValue(value);
        }, 50);
        return () => clearTimeout(timer);
    }, [triggerKey]);

    useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    return (
        <motion.span
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            key={`${triggerKey}-${displayValue}`}
        >
            {formatNumber(Math.round(displayValue))}
        </motion.span>
    );
};

const CombatPanel = ({ socket, gameState, isMobile, onShowHistory }) => {
    const [activeTier, setActiveTier] = useState(1);
    const [battleLogs, setBattleLogs] = useState([]);
    const [sessionLoot, setSessionLoot] = useState(gameState?.state?.combat?.sessionLoot || {});

    const logsEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevCombatRef = useRef(null);
    const [isRestored, setIsRestored] = useState(false);
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [isPlayerHit, setIsPlayerHit] = useState(false);
    const [isMobHit, setIsMobHit] = useState(false);
    const prevFoodAmtRef = useRef(null);
    const [lastFoodEatClient, setLastFoodEatClient] = useState(0);
    // Removed floatingTexts state and logic as requested


    // Cálculo de Stats (Replicado do ProfilePanel para consistência)
    const stats = useMemo(() => {
        return gameState?.calculatedStats || { hp: 100, damage: 5, attackSpeed: 1000, defense: 0 };
    }, [gameState?.calculatedStats]);

    const combat = gameState?.state?.combat;
    const activeMobName = combat ? combat.mobName : null;

    // Track health for shake animation
    const prevMobHealthRef = useRef(combat?.mobHealth);
    const [shakeKey, setShakeKey] = useState(0);

    useEffect(() => {
        if (combat?.mobHealth < prevMobHealthRef.current) {
            setShakeKey(prev => prev + 1);
        }
        prevMobHealthRef.current = combat?.mobHealth;
    }, [combat?.mobHealth]);

    // Reset ou Restauração de stats quando o combate muda/inicia
    // Initialize session loot from server state whenever it updates (e.g. initial load or background update)
    useEffect(() => {
        if (gameState?.state?.combat?.sessionLoot) {
            setSessionLoot(gameState.state.combat.sessionLoot);
        }
    }, [gameState?.state?.combat?.sessionLoot]);

    // Reset ou Restauração de stats quando o combate muda/inicia
    useEffect(() => {
        if (!combat || !gameState?.name) return;

        const storageKey = `combat_${gameState.name}`;
        const saved = localStorage.getItem(storageKey);
        let loadedLogs = [];
        let loadedSessionId = null;

        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                loadedLogs = parsed.logs || [];
                loadedSessionId = parsed.startedAt;
                // sessionLoot is handled by server state now
            } catch (e) {
                console.error("Erro ao carregar sessão de combate:", e);
            }
        }

        // Se a sessão salva é a MESMA que a atual (ex: F5), apenas restaura logs
        if (loadedSessionId === combat.started_at) {
            setBattleLogs(loadedLogs.length > 30 ? loadedLogs.slice(loadedLogs.length - 30) : loadedLogs);
            setIsRestored(true);
            return;
        }

        const newLog = { id: generateLogId(), type: 'start-info', content: `Starting combat against ${combat.mobName}...` };
        const combinedLogs = [...loadedLogs, newLog];

        // Pruning: Keep only last 5 'start' markers
        const startMarkers = combinedLogs.filter(l => l.type === 'start-info');
        if (startMarkers.length > 5) {
            const cutoffIndex = combinedLogs.findIndex(l => l === startMarkers[startMarkers.length - 5]);
            setBattleLogs(combinedLogs.slice(cutoffIndex));
        } else {
            setBattleLogs(combinedLogs);
        }

        setIsRestored(true);
    }, [combat?.started_at, combat?.mobId, gameState?.name]);

    // Salvar progresso no localStorage sempre que mudar
    useEffect(() => {
        if (!combat || !gameState?.name || !isRestored) return;

        const storageKey = `combat_${gameState.name}`;
        const data = {
            mobId: combat.mobId,
            startedAt: combat.started_at, // Save ID to separate sessions
            logs: battleLogs
            // Loot not saved here anymore, relies on server
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
    }, [battleLogs, combat?.mobId, combat?.started_at, gameState?.name, isRestored]);

    // Limpar storage quando o combate acaba explicitamente (não apenas no mount)
    useEffect(() => {
        // Se tínhamos combate e agora não temos (e o gameState está carregado), então acabou
        if (prevCombatRef.current && !combat && gameState?.name) {
            localStorage.removeItem(`combat_${gameState.name}`);
            setIsRestored(false);
            setSessionLoot({});
        }
        prevCombatRef.current = combat;
    }, [combat, gameState?.name]);

    const logIdRef = useRef(0);
    const generateLogId = () => {
        logIdRef.current += 1;
        return `${Date.now()}-${logIdRef.current}`;
    };

    // Listen for real-time battle events
    useEffect(() => {
        if (!socket) return;

        const handleActionResult = (result) => {
            const newLogs = [];

            if (result.healingUpdate && result.healingUpdate.amount > 0) {
                newLogs.push({
                    id: generateLogId(),
                    type: 'heal',
                    content: `You healed for ${result.healingUpdate.amount} HP.`,
                    color: '#4caf50',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                });
            }

            if (result.combatUpdate) {
                const update = result.combatUpdate;
                const rounds = update.allRounds || [update];

                rounds.forEach(round => {
                    const details = round.details;
                    if (!details) return;

                    // Player Damage Visuals
                    if (details.playerHitList && details.playerHitList.length > 0) {
                        setIsMobHit(true);
                        setTimeout(() => setIsMobHit(false), 200);

                        details.playerHitList.forEach(hit => {
                            newLogs.push({
                                id: generateLogId(),
                                type: 'combat',
                                content: `You dealt ${hit.dmg} damage${hit.isBurst ? ' (Burst!)' : ''}.`,
                                color: hit.isBurst ? '#ff9800' : '#4a90e2',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            });
                        });
                    } else if (details.playerDmg > 0) {
                        // Fallback for aggregate data
                        setIsMobHit(true);
                        setTimeout(() => setIsMobHit(false), 200);

                        const hitsText = (details.playerHits > 1) ? ` (${details.playerHits} hits)` : '';
                        newLogs.push({
                            id: generateLogId(),
                            type: 'combat',
                            content: `You dealt ${details.playerDmg} damage${hitsText}.`,
                            color: '#4a90e2',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }

                    // Mob Damage Visuals
                    if (details.mobHitList && details.mobHitList.length > 0) {
                        setIsPlayerHit(true);
                        setTimeout(() => setIsPlayerHit(false), 200);

                        details.mobHitList.forEach(dmg => {
                            newLogs.push({
                                id: generateLogId(),
                                type: 'combat',
                                content: `${details?.mobName || 'Enemy'} dealt ${dmg} damage.`,
                                color: '#ff4444',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            });
                        });
                    } else if (details.mobDmg > 0) {
                        // Fallback for aggregate data
                        setIsPlayerHit(true);
                        setTimeout(() => setIsPlayerHit(false), 200);

                        const hitsText = (details.mobHits > 1) ? ` (${details.mobHits} hits)` : '';
                        newLogs.push({
                            id: generateLogId(),
                            type: 'combat',
                            content: `${details?.mobName || 'Enemy'} dealt ${details.mobDmg} damage${hitsText}.`,
                            color: '#ff4444',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }

                    if (details.silverGained > 0) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'reward',
                            content: `+${details.silverGained} Silver collected!`,
                            color: 'var(--accent)',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }

                    if (details.lootGained?.length > 0) {
                        setSessionLoot(prev => {
                            const newLoot = { ...prev };
                            details.lootGained.forEach(item => {
                                newLoot[item] = (newLoot[item] || 0) + 1;
                            });
                            return newLoot;
                        });
                        details.lootGained.forEach(item => {
                            const itemData = resolveItem(item);
                            newLogs.push({
                                id: generateLogId(),
                                type: 'loot',
                                content: `Item found: ${itemData ? (itemData.tier ? `T${itemData.tier} ${itemData.name}` : itemData.name) : formatItemId(item)}!`,
                                color: '#ae00ff',
                                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            });
                        });
                    }

                    if (details.victory) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'victory',
                            content: `Victory! ${details?.mobName || 'Enemy'} defeated.`,
                            color: '#4caf50',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }

                    if (details.defeat) {
                        newLogs.push({
                            id: generateLogId(),
                            type: 'defeat',
                            content: `You were defeated! Returning to town...`,
                            color: '#ff4444',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }
                });
            }

            if (newLogs.length > 0) {
                setBattleLogs(prev => {
                    let updated = [...prev];

                    newLogs.forEach(newLog => {
                        const lastLog = updated[updated.length - 1];

                        // Aggregate Heals
                        if (newLog.type === 'heal' && lastLog && lastLog.type === 'heal') {
                            // Extract numeric amount from previous log content
                            const prevAmountMatch = lastLog.content.match(/healed for (\d+) HP/);
                            const newAmountMatch = newLog.content.match(/healed for (\d+) HP/);

                            if (prevAmountMatch && newAmountMatch) {
                                const prevAmount = parseInt(prevAmountMatch[1]);
                                const newAmount = parseInt(newAmountMatch[1]);
                                const total = prevAmount + newAmount;

                                // Update last log instead of adding new one
                                updated[updated.length - 1] = {
                                    ...lastLog,
                                    content: `You healed for ${total} HP.`,
                                    count: (lastLog.count || 1) + 1,
                                    id: newLog.id // Refresh ID to trigger animation if needed, or keep old? separate ID usually better for keys
                                };
                                return;
                            }
                        }

                        updated.push(newLog);
                    });

                    if (updated.length > 20) {
                        return updated.slice(updated.length - 20);
                    }
                    return updated;
                });
            }
        };

        socket.on('action_result', handleActionResult);
        return () => socket.off('action_result', handleActionResult);
    }, [socket]);

    // Auto-scroll logs (só se estiver perto do fundo)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            const isNearBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            if (isNearBottom) {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
                setShowScrollButton(false);
            } else {
                setShowScrollButton(true);
            }
        }
    }, [battleLogs]);

    // Timer para o cronômetro de interface (200ms para fluidez)
    useEffect(() => {
        if (!combat) return;

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 200);

        return () => clearInterval(timer);
    }, [!!combat]);

    const scrollToBottom = () => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
            setShowScrollButton(false);
        }
    };

    const handleFight = (mob) => {
        socket.emit('start_combat', { tier: mob.tier, mobId: mob.id });
    };

    const handleStopCombat = () => {
        socket.emit('stop_combat');
        // Limpar persistência ao parar manualmente
        if (gameState?.name) {
            localStorage.removeItem(`combat_${gameState.name}`);
        }
    };

    // Active Combat View
    if (combat) {
        const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
        // Preferencialmente usar o startTime do servidor para consistência absoluta
        const actualStartTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();
        const duration = Math.max(1, Math.floor((currentTime - actualStartTime) / 1000));

        // Use Server Stats
        const totalDmgDealt = combat.totalPlayerDmg || 0;
        const totalBurstDmg = combat.totalBurstDmg || 0;
        const burstCount = combat.burstCount || 0;
        const normalDmg = totalDmgDealt - totalBurstDmg;
        const xpGained = combat.sessionXp || 0;
        const silverGained = combat.sessionSilver || 0;
        const kills = combat.kills || 0;
        const savedFoodCount = combat.savedFoodCount || 0;
        const foodConsumed = combat.foodConsumed || 0;

        const dps = totalDmgDealt / duration;
        const xph = (xpGained / duration) * 3600;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isMobile ? '8px' : '10px', padding: isMobile ? '8px' : '10px', overflowY: 'hidden' }}>
                {/* Battle Header */}
                <div className="glass-panel" style={{
                    padding: '8px 15px',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    background: 'rgba(255, 68, 68, 0.08)',
                    border: '1px solid rgba(255, 68, 68, 0.2)',
                    borderRadius: '8px',
                    flexShrink: 0,
                    gap: isMobile ? '10px' : '0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#ff4444', padding: '6px', borderRadius: '6px', display: 'flex', overflow: 'hidden' }}>
                            {activeMob && activeMob.image ? (
                                <img src={`/monsters/${activeMob.image}`} alt={activeMob.name} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            ) : (
                                <Sword color="#fff" size={16} />
                            )}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.55rem', color: '#ff4444', fontWeight: '900', letterSpacing: '1px' }}>IN COMBAT</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>T{combat.tier}: {combat.mobName}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: isMobile ? '10px' : '20px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
                        {/* Survival Estimator */}
                        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>SURVIVAL</div>
                            {(() => {
                                const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
                                if (!activeMob) return <span style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#888' }}>-</span>;

                                const foodItem = gameState?.state?.equipment?.food;
                                const foodAmount = typeof foodItem?.amount === 'object' ? (foodItem.amount.amount || 0) : (Number(foodItem?.amount) || 0);

                                const survival = calculateSurvivalTime(
                                    stats,
                                    activeMob,
                                    foodItem ? resolveItem(foodItem.id) : null,
                                    foodAmount,
                                    combat.playerHealth || 1,
                                    gameState?.state?.isPremium || gameState?.state?.membership?.active
                                );

                                return (
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: survival.color }}>
                                        {survival.text}
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>DURATION</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                                {`${Math.floor(duration / 3600).toString().padStart(2, '0')}:${Math.floor((duration % 3600) / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Battle Area */}
                <motion.div
                    animate={shakeKey > 0 ? {
                        x: [-2, 2, -2, 2, 0],
                        y: [0, -3, 0],
                    } : {}}
                    transition={{ duration: 0.2 }}
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '20px',
                        flex: isMobile ? 'none' : 1,
                        minHeight: 0
                    }}
                >
                    {/* Visual Arena */}
                    <div className="glass-panel" style={{ flex: isMobile ? 'none' : 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: isMobile ? '180px' : '150px' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at center, rgba(255, 68, 68, 0.1) 0%, transparent 70%)', zIndex: 0 }} />

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 1, padding: isMobile ? '10px' : '15px' }}>
                            {/* Player Side */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                <motion.div
                                    style={{
                                        width: isMobile ? '50px' : '100px', height: isMobile ? '50px' : '100px',
                                        background: 'linear-gradient(135deg, var(--accent) 0%, #003366 100%)',
                                        borderRadius: '50%', border: isMobile ? '2px solid #fff' : '4px solid #fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 20px var(--accent-soft)',
                                        marginBottom: '10px',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                    <User size={isMobile ? 25 : 50} color="#000" />

                                </motion.div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.9rem', fontWeight: '900', color: 'var(--text-main)', textAlign: 'center', width: '100%' }}>{gameState?.name?.toUpperCase()}</div>
                                <div style={{
                                    fontSize: isMobile ? '0.9rem' : '1.3rem',
                                    fontWeight: '900',
                                    color: '#4caf50',
                                    marginTop: '2px',
                                    textAlign: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                    minWidth: isMobile ? '120px' : '200px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    <span>{formatNumber(Math.round(combat.playerHealth))}</span>
                                    <span>/</span>
                                    <span>{formatNumber(Math.round(stats.maxHP || stats.hp))}</span>
                                    <span style={{ marginLeft: '4px' }}>HP</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                {/* Food Badge - Circular Cooldown + Tier + Quantity */}
                                {gameState?.state?.equipment?.food?.amount > 0 && (() => {
                                    const food = gameState.state.equipment.food;
                                    const amt = typeof food.amount === 'object' ? (food.amount.amount || 0) : (Number(food.amount) || 0);
                                    const tier = food.tier || (food.id ? parseInt(food.id.match(/T(\d+)/)?.[1] || '0') : 0);
                                    // Client-side cooldown tracking: detect when food amount changes
                                    const currentAmt = amt;
                                    if (prevFoodAmtRef.current !== null && currentAmt < prevFoodAmtRef.current) {
                                        // Food was just consumed - record client timestamp
                                        setLastFoodEatClient(Date.now());
                                    }
                                    prevFoodAmtRef.current = currentAmt;

                                    const COOLDOWN_MS = 5000;
                                    const elapsed = currentTime - lastFoodEatClient;
                                    const progress = lastFoodEatClient === 0 ? 1 : Math.min(1, elapsed / COOLDOWN_MS);
                                    const isReady = progress >= 1;

                                    // SVG circular progress
                                    const size = isMobile ? 48 : 64;
                                    const stroke = 3.5;
                                    const radius = (size / 2) - stroke;
                                    const circumference = 2 * Math.PI * radius;
                                    const dashOffset = circumference * (1 - progress);

                                    return (
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '2px',
                                            position: 'relative'
                                        }}>
                                            {/* Circular ring with icon */}
                                            <div style={{ position: 'relative', width: size, height: size }}>
                                                <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                                                    {/* Background ring */}
                                                    <circle
                                                        cx={size / 2} cy={size / 2} r={radius}
                                                        fill="none"
                                                        stroke="rgba(255,255,255,0.08)"
                                                        strokeWidth={stroke}
                                                    />
                                                    {/* Progress ring */}
                                                    <circle
                                                        cx={size / 2} cy={size / 2} r={radius}
                                                        fill="none"
                                                        stroke={isReady ? '#4caf50' : '#ff6b6b'}
                                                        strokeWidth={stroke}
                                                        strokeDasharray={circumference}
                                                        strokeDashoffset={dashOffset}
                                                        strokeLinecap="round"
                                                        style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
                                                    />
                                                </svg>
                                                {/* Center icon - actual food image */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <img
                                                        src={food.icon || `/items/${food.id}.webp`}
                                                        alt="Food"
                                                        style={{
                                                            width: isMobile ? 28 : 36,
                                                            height: isMobile ? 28 : 36,
                                                            objectFit: 'contain',
                                                            opacity: isReady ? 1 : 0.5,
                                                            transition: 'opacity 0.3s',
                                                            filter: isReady ? 'none' : 'grayscale(50%)'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {/* Tier + Quantity label */}
                                            <div style={{
                                                fontSize: isMobile ? '0.65rem' : '0.8rem',
                                                fontWeight: '900',
                                                color: isReady ? '#4caf50' : '#ff6b6b',
                                                letterSpacing: '0.5px',
                                                transition: 'color 0.3s'
                                            }}>
                                                T{tier} × {amt}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div style={{ fontSize: isMobile ? '1rem' : '1.5rem', fontWeight: '900', color: 'var(--text-dim)', opacity: 0.2 }}>VS</div>
                            </div>

                            {/* Mob Side */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                                <motion.div
                                    style={{
                                        width: isMobile ? '50px' : '100px', height: isMobile ? '50px' : '100px',
                                        background: 'var(--slot-bg)',
                                        borderRadius: '50%', border: isMobile ? '2px solid #ff4444' : '4px solid #ff4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 20px rgba(255, 68, 68, 0.4)',
                                        marginBottom: '10px',
                                        position: 'relative',
                                        zIndex: 2
                                    }}>
                                    {activeMob && activeMob.image ? (
                                        <img src={`/monsters/${activeMob.image}`} alt={activeMob.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', transform: activeMob.flipCombat ? 'scaleX(-1)' : 'none' }} />
                                    ) : (
                                        <Skull size={isMobile ? 25 : 50} color="#ff4444" />
                                    )}
                                </motion.div>
                                <div style={{ fontSize: isMobile ? '0.6rem' : '0.9rem', fontWeight: '900', color: 'var(--text-main)', textAlign: 'center', width: '100%' }}>{combat.mobName.toUpperCase()}</div>
                                <div style={{
                                    fontSize: isMobile ? '0.9rem' : '1.3rem',
                                    fontWeight: '900',
                                    color: '#ff4444',
                                    marginTop: '2px',
                                    textAlign: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                    minWidth: isMobile ? '120px' : '200px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}>
                                    <AnimatedCounter value={combat.mobHealth} maxValue={combat.mobMaxHealth} triggerKey={combat.kills} />
                                    <span>/</span>
                                    <span>{formatNumber(combat.mobMaxHealth)}</span>
                                    <span style={{ marginLeft: '4px' }}>HP</span>
                                </div>
                            </div>


                        </div>

                        {/* Health Bars Overlay */}
                        <div style={{ padding: '15px', borderTop: '1px solid var(--border)', background: 'var(--bg-dark)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginBottom: '3px' }}>CHARACTER HEALTH</div>
                                    <div style={{ height: '8px', background: 'var(--slot-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(combat.playerHealth / (stats.maxHP || stats.hp || 100)) * 100}%`, height: '100%', background: '#4caf50', transition: 'width 0.3s' }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', textAlign: isMobile ? 'left' : 'right', marginBottom: '3px' }}>MONSTER HEALTH</div>
                                    <div style={{ height: '8px', background: 'var(--slot-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <motion.div
                                            key={`mob-hp-${combat.kills}`}
                                            initial={{ width: '100%' }}
                                            animate={{ width: `${(combat.mobHealth / combat.mobMaxHealth) * 100}%` }}
                                            transition={{ duration: 0.3, ease: "easeOut" }}
                                            style={{ height: '100%', background: '#ff4444' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Combat Console & Stats */}
                <div style={{ flex: isMobile ? 'none' : 1.5, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'hidden' }}>
                    {/* Stats Dashboard */}
                    <div className="glass-panel" style={{
                        padding: '8px',
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
                        gap: '5px',
                        flexShrink: 0
                    }}>
                        <div style={{ background: 'var(--slot-bg)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Activity size={10} /> DPS
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4a90e2' }}>{formatCompactNumber(dps)}</div>
                        </div>
                        <div style={{ background: 'var(--slot-bg)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Trophy size={10} /> KILLS
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{formatCompactNumber(kills)}</div>
                        </div>
                        <div style={{ background: 'var(--slot-bg)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Heart size={10} /> FOOD USE / SAVED
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff4444' }}>{formatCompactNumber(foodConsumed)} / {formatCompactNumber(savedFoodCount)}</div>
                        </div>
                        <div style={{ background: 'var(--slot-bg)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <TrendingUp size={10} /> TOTAL DAMAGE
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatCompactNumber(totalDmgDealt)}</div>
                        </div>
                        <div style={{ background: 'var(--slot-bg)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Zap size={10} /> DMG / CRIT
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                <span>{formatCompactNumber(normalDmg)}</span>
                                <span style={{ color: '#ff8c00', marginLeft: '4px' }}>/ {formatCompactNumber(totalBurstDmg)}</span>
                            </div>
                        </div>
                        <div style={{ background: 'var(--accent-soft)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-active)', gridColumn: isMobile ? 'span 2' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Coins size={10} /> SILVER
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{formatCompactNumber(silverGained)}</div>
                        </div>
                        <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)', gridColumn: isMobile ? 'span 3' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Star size={10} /> TOTAL XP
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatCompactNumber(xpGained)}</div>
                        </div>
                        <div style={{ background: 'rgba(76, 175, 80, 0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(76, 175, 80, 0.2)', gridColumn: isMobile ? 'span 3' : 'span 1' }}>
                            <div style={{ fontSize: '0.55rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Activity size={10} /> XP/H
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4caf50' }}>{formatCompactNumber(Math.floor(xph))}</div>
                        </div>
                    </div>

                    {/* Session Loot */}
                    <div className="glass-panel" style={{ padding: '8px', background: 'rgba(174, 0, 255, 0.05)', border: '1px solid rgba(174, 0, 255, 0.2)', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: '#ae00ff', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Zap size={12} /> SESSION LOOT_
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(sessionLoot).length === 0 ? (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Waiting for drops...</span>
                            ) : (
                                Object.entries(sessionLoot).map(([id, qty]) => {
                                    const itemData = resolveItem(id);
                                    return (
                                        <div key={id} style={{
                                            background: 'var(--slot-bg)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{qty}x</span>
                                            <span style={{ fontSize: '0.7rem', color: '#ae00ff', textTransform: 'capitalize' }}>{itemData ? (itemData.tier ? `T${itemData.tier} ${itemData.name}` : itemData.name) : formatItemId(id)}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Battle Console */}
                    <div className="glass-panel" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'hidden',
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--border)',
                        flex: isMobile ? 1 : 'none',
                        height: isMobile ? 'auto' : '140px',
                        minHeight: isMobile ? '150px' : '100px',
                        maxHeight: isMobile ? '300px' : '500px',
                        position: 'relative'
                    }}>
                        <div style={{ padding: '6px 12px', background: 'var(--accent-soft)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <Terminal size={10} color="var(--accent)" />
                            <span style={{ fontSize: '0.55rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>LOG_</span>
                        </div>
                        <div
                            className="scroll-container"
                            ref={scrollContainerRef}
                            style={{ flex: 1, height: '100%', padding: '10px', fontFamily: 'monospace', fontSize: isMobile ? '0.7rem' : '0.85rem', color: 'var(--text-main)', overflowY: 'scroll' }}
                        >
                            {battleLogs.map(log => (
                                <div key={log.id} style={{ marginBottom: '3px', borderLeft: `2px solid ${log.color || '#333'}`, paddingLeft: '6px' }}>
                                    <span style={{ color: log.color || 'var(--text-main)', opacity: 0.5 }}>[{log.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.content}
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>

                        {/* Scroll to Bottom Button */}
                        {showScrollButton && (
                            <button
                                onClick={scrollToBottom}
                                style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--accent)',
                                    color: '#000',
                                    border: 'none',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    fontSize: '0.55rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                    zIndex: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <Clock size={10} /> NEW MESSAGES ↓
                            </button>
                        )}
                    </div>

                    {/* Flee Button */}
                    <button
                        onClick={handleStopCombat}
                        style={{
                            width: '100%',
                            padding: isMobile ? '12px' : '15px',
                            background: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid #ff4444',
                            color: '#ff4444',
                            borderRadius: '8px',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            letterSpacing: '2px',
                            transition: '0.2s',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; }}
                    >
                        FLEE FROM BATTLE
                    </button>
                </div>
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Header / Filter */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sword size={18} color="#ff4444" />
                        <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>Hunting Grounds</h2>
                    </div>
                    <button onClick={onShowHistory} style={{ background: 'none', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> History
                    </button>
                </div>

                {/* Tier Selector - Compact Horizontal */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(tier => (
                        <button key={tier}
                            onClick={() => setActiveTier(tier)}
                            style={{
                                padding: '4px 12px',
                                flexShrink: 0,
                                background: activeTier === tier ? 'rgba(255, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: `1px solid ${activeTier === tier ? '#ff4444' : 'rgba(255, 255, 255, 0.05)'}`,
                                borderRadius: '4px',
                                color: activeTier === tier ? '#ff4444' : '#555',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}>
                            T{tier}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-panel scroll-container" style={{ flex: 1, padding: isMobile ? '5px' : '15px', background: 'var(--bg-dark)', overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px', paddingBottom: '40px' }}>
                    {(MONSTERS[activeTier] || []).filter(m => !m.id.startsWith('BOSS_') && !m.dungeonOnly).map(mob => {
                        const playerDmg = stats.damage;

                        // 1. Calculate Mitigation (Server-side formula: 100 def = 1% [def/10000])
                        const mobDef = mob.defense || 0;
                        const mobMitigation = Math.min(0.75, mobDef / 10000);

                        // 2. Include average Burst Damage in the calculation
                        const burstChance = stats.burstChance || 0;
                        const burstDmg = stats.burstDmg || 1.5;
                        const avgDmgMultiplier = 1 + (burstChance / 100 * (burstDmg - 1));

                        const baseMitigatedDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)));
                        const mitigatedDmg = baseMitigatedDmg * avgDmgMultiplier;

                        // 3. Calculate Time per Cycle
                        // Server: Hit happens at start of round. Fight ends at lethal blow.
                        const roundsToKill = Math.ceil(mob.health / mitigatedDmg);
                        const interval = (stats.attackSpeed || 1000) / 1000;
                        const killTime = roundsToKill * interval;
                        const cycleTime = killTime + 1.0; // +1s Respawn Delay

                        const killsPerHour = 3600 / cycleTime;

                        // 4. Rewards Calculations
                        const xpBonus = stats.globals?.xpYield || 0;
                        const silverBonus = stats.globals?.silverYield || 0;

                        const xpPerKill = Math.floor(mob.xp * (1 + xpBonus / 100));
                        const xpHour = killsPerHour * xpPerKill;

                        const avgSilver = (mob.silver[0] + mob.silver[1]) / 2;
                        const silverPerKill = Math.floor(avgSilver * (1 + silverBonus / 100));
                        const silverHour = killsPerHour * silverPerKill;

                        const isLocked = ((activeTier === 1 ? 1 : (activeTier - 1) * 10) > (gameState?.state?.skills?.COMBAT?.level || 1));


                        return (
                            <div key={mob.id} style={{
                                display: 'flex',
                                flexDirection: 'row',
                                flexWrap: isMobile ? 'wrap' : 'nowrap', // Wrap on mobile
                                background: isLocked ? 'var(--bg-dark)' : 'var(--panel-bg)',
                                border: `1px solid ${isLocked ? 'var(--border)' : 'var(--border-active)'}`,
                                borderRadius: '8px',
                                padding: isMobile ? '8px' : '12px 16px', // Less padding mobile
                                gap: isMobile ? '8px' : '15px',
                                alignItems: 'center',
                                transition: '0.2s',
                                opacity: isLocked ? 0.6 : 1,
                                position: 'relative',
                                borderLeft: `3px solid ${isLocked ? '#444' : '#ff4444'}`
                            }}>
                                {/* Mob Basic Info */}
                                <div style={{ flex: isMobile ? '1 1 auto' : '1.2', display: 'flex', gap: '8px', alignItems: 'center', minWidth: isMobile ? '50%' : 'auto' }}>
                                    <div style={{
                                        width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', background: 'var(--slot-bg)', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden'
                                    }}>
                                        {mob.image ? (
                                            <img src={`/monsters/${mob.image}`} alt={mob.name} style={{ width: '100%', height: '100%', objectFit: 'contain', transform: mob.flipList ? 'scaleX(-1)' : 'none' }} />
                                        ) : (
                                            <Skull size={isMobile ? 16 : 20} color={isLocked ? '#555' : '#ff4444'} />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: isMobile ? '0.85rem' : '1rem' }}>{mob.name}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: isMobile ? '0.6rem' : '0.7rem', display: 'flex', gap: '6px' }}>
                                            <span style={{ color: '#ff4444' }}>HP:{formatNumber(mob.health)}</span>
                                            <span style={{ color: '#ff9800' }}>D:{formatNumber(mob.damage)}</span>
                                            <span style={{ color: '#4caf50' }}>XP:{formatNumber(mob.xp)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button (Mobile: Right align on first row) */}
                                <div style={{ flex: isMobile ? '0 0 auto' : '0.8', display: 'flex', justifyContent: 'flex-end', order: isMobile ? 2 : 10 }}>
                                    <button
                                        onClick={() => !isLocked && handleFight(mob)}
                                        disabled={isLocked}
                                        style={{
                                            padding: isMobile ? '6px 12px' : '8px 16px',
                                            background: isLocked ? '#222' : 'rgba(255, 68, 68, 0.1)',
                                            border: isLocked ? '1px solid #333' : '1px solid #ff4444',
                                            color: isLocked ? '#555' : '#ff4444',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            cursor: isLocked ? 'not-allowed' : 'pointer',
                                            transition: '0.2s',
                                        }}
                                    >
                                        {isLocked ? 'LCK' : 'FIGHT'}
                                    </button>
                                </div>

                                {/* Efficiency Stats (Mobile: New Line, Full Width) */}
                                <div style={{
                                    flex: isMobile ? '1 1 100%' : '2',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '5px',
                                    borderLeft: isMobile ? 'none' : '1px solid var(--border)',
                                    borderRight: isMobile ? 'none' : '1px solid var(--border)',
                                    padding: isMobile ? '6px 0' : '0 15px',
                                    order: 3,
                                    borderTop: isMobile ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                    marginTop: isMobile ? '4px' : '0'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>XP/H</div>
                                        <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#4caf50' }}>
                                            {formatNumber(xpHour)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>SILVER/H</div>
                                        <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: '#d4af37' }}>
                                            {formatNumber(silverHour)}
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>SURVIVAL</div>
                                        {(() => {
                                            const foodItem = gameState?.state?.equipment?.food;
                                            const foodAmount = typeof foodItem?.amount === 'object' ? (foodItem.amount.amount || 0) : (Number(foodItem?.amount) || 0);

                                            const survival = calculateSurvivalTime(
                                                stats,
                                                mob,
                                                foodItem ? resolveItem(foodItem.id) : null,
                                                foodAmount,
                                                combat?.playerHealth || gameState?.state?.health || 1,
                                                gameState?.state?.isPremium || gameState?.state?.membership?.active
                                            );

                                            return (
                                                <div style={{ fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 'bold', color: survival.color }}>
                                                    {survival.text}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Drops (Compact) */}
                                <div style={{ flex: isMobile ? '1 1 100%' : '1.5', display: 'flex', flexWrap: 'wrap', gap: '4px', order: 4 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(212, 175, 55, 0.1)', padding: '2px 6px', borderRadius: '4px', color: '#d4af37', fontSize: '0.65rem' }}>
                                        <Coins size={10} /> {isMobile ? `${formatNumber(mob.silver[0])}-${formatNumber(mob.silver[1])}` : `${formatNumber(mob.silver[0])}-${formatNumber(mob.silver[1])} Silver`}
                                    </span>
                                    {Object.entries(mob.loot).map(([id, chance]) => (
                                        <span key={id} style={{
                                            background: chance <= 0.05 ? 'rgba(174, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                            padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: chance <= 0.05 ? '#ae00ff' : '#aaa',
                                            border: '1px solid rgba(255,255,255,0.03)'
                                        }}>
                                            {id.replace(/_/g, ' ')} <span style={{ opacity: 0.7, fontSize: '0.6rem', marginLeft: '3px' }}>{(chance * 100).toFixed(1).replace('.0', '')}%</span>
                                        </span>
                                    ))}
                                </div>

                            </div>
                        );
                    })}
                </div>
            </div >
        </div >
    );
};

export default CombatPanel;
