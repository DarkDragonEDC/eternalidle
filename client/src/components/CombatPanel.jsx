import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Activity, User, Skull, Clock, Target, Zap, TrendingUp, Coins, Package, History, ChevronLeft, ChevronRight, Heart, Trophy, Terminal, Star } from 'lucide-react';
import { resolveItem, formatItemId } from '@shared/items';
import { formatNumber, formatCompactNumber, formatSilver } from '@utils/format';
import { MONSTERS } from '@shared/monsters';
import { calculateSurvivalTime } from '@utils/combat';
import { useAppStore } from '../store/useAppStore';

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

const CombatPanel = ({ socket, gameState, isMobile, onShowHistory, serverTimeOffset = 0, isPreviewActive, onPreviewActionBlocked }) => {
    const store = useAppStore();
    const { combatActionResult: actionResult, setCombatActionResult: setActionResult } = store;

    const [activeTier, setActiveTier] = useState(1);
    const [battleLogs, setBattleLogs] = useState([]);
    const [sessionLoot, setSessionLoot] = useState(gameState?.state?.combat?.sessionLoot || {});

    const logsEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevCombatRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(Date.now() - serverTimeOffset);
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now() - serverTimeOffset), 200);
        return () => clearInterval(timer);
    }, [serverTimeOffset]);

    const [isPlayerHit, setIsPlayerHit] = useState(false);
    const [isMobHit, setIsMobHit] = useState(false);
    const prevFoodAmtRef = useRef(null);
    const [lastFoodEatClient, setLastFoodEatClient] = useState(0);
    const [isRestored, setIsRestored] = useState(false);

    // --- SMOOTHED DPS/XPH via EMA ---
    const smoothedDpsRef = useRef(0);
    const smoothedXphRef = useRef(0);
    const [smoothedDps, setSmoothedDps] = useState(0);
    const [smoothedXph, setSmoothedXph] = useState(0);

    // --- STABLE DURATION TIMER (incremental, not recalculated) ---
    const [stableDuration, setStableDuration] = useState(0);
    const stableDurationRef = useRef(0);
    const combatStartRef = useRef(null);


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

    // Track food changes to trigger client-side cooldown if server lastFoodAt is missing or delayed
    useEffect(() => {
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

    // React to centralized battle events from store
    useEffect(() => {
        if (!actionResult) return;

        const handleResult = (result) => {
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
                        // Update session total loot for this encounter/round
                        setSessionLoot(prev => {
                            const newLoot = { ...prev };
                            details.lootGained.forEach(item => {
                                const itemId = typeof item === 'object' ? item.id : item;
                                const amount = typeof item === 'object' ? (item.amount || 1) : 1;
                                newLoot[itemId] = (newLoot[itemId] || 0) + amount;
                            });
                            return newLoot;
                        });

                        // Add specialized log entry for each item found
                        details.lootGained.forEach(item => {
                            const itemId = typeof item === 'object' ? item.id : item;
                            const amount = typeof item === 'object' ? (item.amount || 1) : 1;
                            const itemData = resolveItem(itemId);
                            const itemName = itemData ? (itemData.tier ? `T${itemData.tier} ${formatItemId(itemId)}` : formatItemId(itemId)) : formatItemId(itemId);
                            const detailTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            
                            newLogs.push({
                                id: generateLogId(),
                                type: 'loot',
                                content: `Item found: ${amount > 1 ? `${amount}x ` : ''}${itemName}!`,
                                color: '#ae00ff',
                                timestamp: detailTime
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
                            const prevAmountMatch = lastLog.content.match(/healed for (\d+) HP/);
                            const newAmountMatch = newLog.content.match(/healed for (\d+) HP/);

                            if (prevAmountMatch && newAmountMatch) {
                                const prevAmount = parseInt(prevAmountMatch[1]);
                                const newAmount = parseInt(newAmountMatch[1]);
                                const total = prevAmount + newAmount;

                                updated[updated.length - 1] = {
                                    ...lastLog,
                                    content: `You healed for ${total} HP.`,
                                    count: (lastLog.count || 1) + 1,
                                    id: newLog.id
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

        handleResult(actionResult);
        // Clear result after processing so it doesn't re-trigger
        setActionResult(null);
    }, [actionResult, setActionResult]);

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

    // Stable combat duration timer: syncs with server started_at on mount, then increments locally every 1s
    useEffect(() => {
        if (!combat) {
            setStableDuration(0);
            stableDurationRef.current = 0;
            combatStartRef.current = null;
            smoothedDpsRef.current = 0;
            smoothedXphRef.current = 0;
            setSmoothedDps(0);
            setSmoothedXph(0);
            return;
        }

        // On combat start or restore, sync duration from server timestamp
        const startTime = combat.started_at ? new Date(combat.started_at).getTime() : Date.now();
        if (combatStartRef.current !== startTime) {
            combatStartRef.current = startTime;
            const initialDuration = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
            stableDurationRef.current = initialDuration;
            setStableDuration(initialDuration);
        }

        // Increment locally every second for smooth display
        const timer = setInterval(() => {
            stableDurationRef.current += 1;
            setStableDuration(stableDurationRef.current);
        }, 1000);

        return () => clearInterval(timer);
    }, [combat?.started_at]);

    // Smooth DPS/XPH with EMA when server data updates
    useEffect(() => {
        if (!combat) return;
        const dur = stableDurationRef.current || 1;
        const rawDps = (combat.totalPlayerDmg || 0) / dur;
        const rawXph = ((combat.sessionXp || 0) / dur) * 3600;

        // EMA smoothing factor (lower = smoother, 0.3 is good balance)
        const alpha = smoothedDpsRef.current === 0 ? 1 : 0.3;
        smoothedDpsRef.current = smoothedDpsRef.current * (1 - alpha) + rawDps * alpha;
        smoothedXphRef.current = smoothedXphRef.current * (1 - alpha) + rawXph * alpha;
        setSmoothedDps(smoothedDpsRef.current);
        setSmoothedXph(smoothedXphRef.current);
    }, [combat?.totalPlayerDmg, combat?.sessionXp, stableDuration]);

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
        // Use stable incrementing duration instead of recalculating from Date.now()
        const duration = stableDuration || 1;

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

        // Use smoothed DPS/XPH from EMA refs
        const dps = smoothedDps;
        const xph = smoothedXph;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isMobile ? '8px' : '10px', padding: isMobile ? '8px' : '10px', paddingBottom: isMobile ? '80px' : '60px', overflowY: 'auto' }}>
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

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>TIME TO KILL (TTK)</div>
                            {(() => {
                                const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
                                if (!activeMob) return <span style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#888' }}>-</span>;

                                const playerDmg = stats.damage;
                                const mobDef = activeMob.defense || 0;
                                const mobMitigation = Math.min(0.75, mobDef / 10000);
                                const burstChance = stats.burstChance || 0;
                                const burstDmg = stats.burstDmg || 1.5;
                                const avgDmgMultiplier = 1 + (burstChance / 100 * (burstDmg - 1));
                                const finalMitigatedDmg = Math.max(1, Math.floor(playerDmg * (1 - mobMitigation)) * avgDmgMultiplier);

                                const roundsToKill = Math.ceil(activeMob.health / finalMitigatedDmg);
                                const interval = (stats.attackSpeed || 1000) / 1000;
                                const cycleTime = (roundsToKill * interval) + 1.0; // 1s Respawn + First Hit Delay

                                return (
                                    <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--accent)' }}>
                                        {cycleTime.toFixed(1)}s
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>SURVIVAL</div>
                            {(() => {
                                const activeMob = (MONSTERS[combat.tier] || []).find(m => m.id === combat.mobId);
                                const foodItem = gameState?.state?.equipment?.food;
                                const foodAmount = typeof foodItem?.amount === 'object' ? (foodItem.amount.amount || 0) : (Number(foodItem?.amount) || 0);

                                const weaponId = (gameState?.state?.equipment?.mainHand?.id || '').toUpperCase();
                                let profSkillKey = null;
                                if (weaponId.includes('SWORD')) profSkillKey = 'WARRIOR_PROFICIENCY';
                                else if (weaponId.includes('BOW')) profSkillKey = 'HUNTER_PROFICIENCY';
                                else if (weaponId.includes('STAFF')) profSkillKey = 'MAGE_PROFICIENCY';
                                const profLevel = profSkillKey ? (gameState?.state?.skills?.[profSkillKey]?.level || 1) : 1;

                                const survival = calculateSurvivalTime(
                                    stats,
                                    activeMob,
                                    foodItem ? resolveItem(foodItem.id) : null,
                                    foodAmount,
                                    combat.playerHealth || 1,
                                    gameState?.state?.isPremium || gameState?.state?.membership?.active,
                                    profLevel
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
                                    {gameState?.state?.avatar ? (
                                        <img
                                            src={gameState.state.avatar.replace(/\.(png|jpg|jpeg)$/, '.webp')}
                                            alt="Avatar"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%', borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <User size={isMobile ? 25 : 50} color="#000" />
                                    )}

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

                                    // Use server-provided lastFoodAt if available, fallback to client-side tracking
                                    const serverLastFoodAt = gameState?.state?.lastFoodAt;
                                    const effectiveLastEat = serverLastFoodAt ? new Date(serverLastFoodAt).getTime() : lastFoodEatClient;

                                    const COOLDOWN_MS = 5000;
                                    // Use currentTime (200ms timer) for smooth food cooldown animation
                                    const elapsed = currentTime - effectiveLastEat;
                                    const progress = effectiveLastEat === 0 ? 1 : Math.max(0, Math.min(1, elapsed / COOLDOWN_MS));
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
                <div style={{ flex: isMobile ? 'none' : 1.5, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0, overflow: 'visible' }}>
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
                                            <span style={{ fontSize: '0.7rem', color: '#ae00ff', textTransform: 'capitalize' }}>{itemData ? formatItemId(itemData.id || itemData.name) : formatItemId(id)}</span>
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
                            padding: isMobile ? '14px' : '15px',
                            background: 'rgba(255, 68, 68, 0.15)',
                            border: '2px solid #ff4444',
                            color: '#ff4444',
                            borderRadius: '8px',
                            fontWeight: '900',
                            fontSize: isMobile ? '0.85rem' : '0.8rem',
                            cursor: 'pointer',
                            letterSpacing: '2px',
                            transition: '0.2s',
                            flexShrink: 0,
                            minHeight: '44px',
                            marginTop: isMobile ? '4px' : '0',
                            boxShadow: '0 0 12px rgba(255, 68, 68, 0.15)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.15)'; }}
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
                    {(() => {
                        const mobsInTier = (MONSTERS[activeTier] || []).filter(m => !m.id.startsWith('BOSS_') && !m.dungeonOnly);

                        const xpScores = [];
                        const silverScores = [];

                        const foodItem = gameState?.state?.equipment?.food;
                        const foodAmount = typeof foodItem?.amount === 'object' ? (foodItem.amount.amount || 0) : (Number(foodItem?.amount) || 0);
                        const playerHp = combat?.playerHealth || gameState?.state?.health || 1;
                        const isPremium = gameState?.state?.isPremium || gameState?.state?.membership?.active;

                        const weaponId = (gameState?.state?.equipment?.mainHand?.id || '').toUpperCase();
                        let profKey = null;
                        if (weaponId.includes('SWORD')) profKey = 'WARRIOR_PROFICIENCY';
                        else if (weaponId.includes('BOW')) profKey = 'HUNTER_PROFICIENCY';
                        else if (weaponId.includes('STAFF')) profKey = 'MAGE_PROFICIENCY';
                        const profLevel = profKey ? (gameState?.state?.skills?.[profKey]?.level || 1) : 1;

                        Object.entries(MONSTERS).forEach(([tier, mobs]) => {
                            const tierNum = Number(tier);
                            (mobs || []).filter(m => !m.id.startsWith('BOSS_') && !m.dungeonOnly).forEach(mob => {
                                const survival = calculateSurvivalTime(stats, mob, foodItem ? resolveItem(foodItem.id) : null, foodAmount, playerHp, isPremium, profLevel);

                                // Normalize survival duration for comparison (Unlimited = 24h as a reference)
                                const survivalDurationHours = survival.seconds === Infinity ? 24 : (survival.seconds / 3600);

                                // Calculate XP/H logic
                                const mobDef = mob.defense || 0;
                                const mobMitigation = Math.min(0.75, mobDef / 10000);
                                const burstChance = stats.burstChance || 0;
                                const burstDmg = stats.burstDmg || 1.5;
                                const avgDmgMultiplier = 1 + (burstChance / 100 * (burstDmg - 1));
                                const baseMitigatedDmg = Math.max(1, Math.floor(stats.damage * (1 - mobMitigation)));
                                const finalDmg = Math.max(1, baseMitigatedDmg * avgDmgMultiplier);

                                const rounds = Math.ceil(mob.health / finalDmg);
                                const killTime = rounds * ((stats.attackSpeed || 1000) / 1000);
                                const xpH = (3600 / (killTime + 1.0)) * Math.floor(mob.xp * (1 + (stats.globals?.xpYield || 0) / 100));

                                const sessionXp = xpH * survivalDurationHours;
                                xpScores.push({ id: mob.id, score: sessionXp });

                                const avgSilver = (mob.silver[0] + mob.silver[1]) / 2;
                                const silverPerKill = Math.floor(avgSilver * (1 + (stats.globals?.silverYield || 0) / 100));
                                const silverH = (3600 / (killTime + 1.0)) * silverPerKill;
                                const sessionSilver = silverH * survivalDurationHours;
                                silverScores.push({ id: mob.id, score: sessionSilver });
                            });
                        });

                        // Sort scores and get Top 3
                        xpScores.sort((a, b) => b.score - a.score);
                        silverScores.sort((a, b) => b.score - a.score);

                        const top3XpMobIds = xpScores.slice(0, 3).map(m => m.id);
                        const top3SilverMobIds = silverScores.slice(0, 3).map(m => m.id);

                        return mobsInTier.map(mob => {
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

                            const finalMitigatedDmg = Math.max(1, mitigatedDmg);

                            // 3. Calculate Time per Cycle
                            // Server: Hit happens at start of round. Fight ends at lethal blow.
                            const roundsToKill = Math.ceil(mob.health / finalMitigatedDmg);
                            const interval = (stats.attackSpeed || 1000) / 1000;
                            const cycleTime = (roundsToKill * interval) + 1.0;
                            // +1s Respawn Delay

                            const killsPerHour = 3600 / cycleTime;

                            // 4. Rewards Calculations
                            const xpBonus = stats.globals?.xpYield || 0;
                            const silverBonus = stats.globals?.silverYield || 0;

                            // XP and Silver penalties are REMOVED (now 100% rewards)
                            const xpPerKill = Math.floor(mob.xp * (1 + xpBonus / 100));
                            const xpHour = killsPerHour * xpPerKill;

                            const avgSilver = (mob.silver[0] + mob.silver[1]) / 2;
                            const silverPerKill = Math.floor(avgSilver * (1 + silverBonus / 100));
                            const silverHour = killsPerHour * silverPerKill;

                            const isLocked = ((activeTier === 1 ? 1 : (activeTier - 1) * 10) > (gameState?.state?.skills?.COMBAT?.level || 1));


                            return (
                                <div key={mob.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: isLocked ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                    border: `1px solid ${isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: '12px',
                                    padding: '12px',
                                    gap: '12px',
                                    transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: isLocked ? 0.6 : 1,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isLocked ? 'none' : '0 4px 20px rgba(0,0,0,0.2)'
                                }}>
                                    {/* Top Section: Info & Fight */}
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        {/* Image Box */}
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            flexShrink: 0,
                                            position: 'relative'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                top: '-6px',
                                                left: '-6px',
                                                fontSize: '0.45rem',
                                                background: '#d4af37',
                                                padding: '2px 5px',
                                                borderRadius: '4px',
                                                color: '#000',
                                                fontWeight: '900',
                                                zIndex: 2,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                            }}>
                                                T{activeTier}
                                            </span>
                                            {mob.image ? (
                                                <img src={`/monsters/${mob.image}`} alt={mob.name} style={{ width: '85%', height: '85%', objectFit: 'contain', transform: mob.flipList ? 'scaleX(-1)' : 'none' }} />
                                            ) : (
                                                <Skull size={24} color={isLocked ? '#444' : '#ff4444'} />
                                            )}
                                        </div>

                                        {/* Name & Stats */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ color: '#fff', fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.2px' }}>{mob.name}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: '#ff5555', fontWeight: 'bold' }}>
                                                    <Heart size={8} fill="#ff5555" /> {formatNumber(mob.health)}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: '#ffa726', fontWeight: 'bold' }}>
                                                    <Sword size={8} fill="#ffa726" /> {formatNumber(mob.damage)}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.6rem', color: '#66bb6a', fontWeight: 'bold' }}>
                                                    <Zap size={8} fill="#66bb6a" /> {formatNumber(mob.xp)} XP
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fight Button */}
                                        <button
                                            id={`fight-button-${mob.id}`}
                                            onClick={() => {
                                                if (isLocked) return;
                                                if (isPreviewActive) {
                                                    onPreviewActionBlocked?.();
                                                    return;
                                                }
                                                handleFight(mob);
                                            }}
                                            disabled={isLocked}
                                            style={{
                                                padding: '8px 16px',
                                                background: isLocked ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, #ff4444, #cc0000)',
                                                border: 'none',
                                                color: isLocked ? 'rgba(255,255,255,0.1)' : '#fff',
                                                borderRadius: '8px',
                                                fontSize: '0.7rem',
                                                fontWeight: '900',
                                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                boxShadow: isLocked ? 'none' : '0 4px 12px rgba(255,68,68,0.2)'
                                            }}
                                        >
                                            {isLocked ? 'LOCKED' : 'FIGHT'}
                                        </button>
                                    </div>

                                    {/* Bottom Section: Drops & Survival */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '12px',
                                        paddingTop: '8px',
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        alignItems: 'end'
                                    }}>
                                        {/* Drops List */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: 'rgba(212, 175, 55, 0.1)',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                color: '#d4af37',
                                                fontSize: '0.62rem',
                                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                                fontWeight: '900'
                                            }}>
                                                <Coins size={10} fill="#d4af37" /> 80% {mob.silver[0] === mob.silver[1] ? formatNumber(mob.silver[0]) : `${formatNumber(mob.silver[0])}-${formatNumber(mob.silver[1])}`} SILVER
                                            </div>
                                            {Object.entries(mob.loot).map(([id, lootInfo]) => {
                                                let chance = 0;
                                                let minQty = 1;
                                                let maxQty = 1;

                                                if (Array.isArray(lootInfo)) {
                                                    chance = lootInfo[0];
                                                    minQty = lootInfo[1] || 1;
                                                    maxQty = lootInfo[2] || minQty;
                                                } else {
                                                    chance = lootInfo;
                                                }

                                                const qtyText = maxQty > minQty ? `${minQty}-${maxQty} ` : (minQty > 1 ? `${minQty} ` : '');

                                                return (
                                                    <div key={id} style={{
                                                        background: chance <= 0.05 ? 'rgba(174, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.62rem',
                                                        color: chance <= 0.05 ? '#ae00ff' : 'rgba(255,255,255,0.5)',
                                                        border: `1px solid ${chance <= 0.05 ? 'rgba(174, 0, 255, 0.2)' : 'rgba(255,255,255,0.1)'}`,
                                                        fontWeight: '900',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Target size={10} /> {(chance * 100).toFixed(chance < 0.01 ? 1 : 0)}% {qtyText}T{activeTier} {formatItemId(id.replace(/T\d+_/, ''))}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'end',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {/* Survival Badge */}
                                            <div style={{
                                                padding: '4px 10px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.03)',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Survival (Est.)</div>
                                                <div style={{
                                                    fontSize: '0.85rem', fontWeight: '900', color: (() => {
                                                        const s = calculateSurvivalTime(stats, mob, foodItem ? resolveItem(foodItem.id) : null, foodAmount, playerHp, isPremium, profLevel);
                                                        return s.color;
                                                    })(), fontFamily: 'monospace'
                                                }}>
                                                    {(() => {
                                                        const s = calculateSurvivalTime(stats, mob, foodItem ? resolveItem(foodItem.id) : null, foodAmount, playerHp, isPremium, profLevel);
                                                        return s.text;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* TTK Badge */}
                                            <div style={{
                                                padding: '4px 10px',
                                                background: 'rgba(0,0,0,0.2)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.03)',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>TTK (Est.)</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--accent)', fontFamily: 'monospace' }}>
                                                    {cycleTime.toFixed(1)}s
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    })()}
                </div>
            </div >
        </div >
    );
};

export default CombatPanel;
