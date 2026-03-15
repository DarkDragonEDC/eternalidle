import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Users, Coins, Zap, Clock, ChevronDown, Plus, Trophy, Menu, Lock } from 'lucide-react';
import { GUILD_TASKS_CONFIG } from '@shared/guilds.js';

const getItemIcon = (itemId) => {
    if (!itemId) return '/items/placeholder.webp';
    if (itemId.includes('_POTION_')) {
        const parts = itemId.split('_');
        const tier = parts[0];
        const type = parts[parts.length - 1];
        const potionMap = {
            'GATHER': 'GATHERING', 'REFINE': 'REFINING', 'CRAFT': 'CRAFTING',
            'SILVER': 'SILVER', 'QUALITY': 'QUALITY', 'LUCK': 'LUCK',
            'XP': 'KNOWLEDGE', 'CRIT': 'CRITICAL', 'DAMAGE': 'DAMAGE'
        };
        return `/items/${tier}_${potionMap[type] || type}_POTION.webp`;
    }
    return `/items/${itemId}.webp`;
};

const formatItemName = (itemId, type) => {
    if (!itemId) return type || 'Unknown';
    const match = itemId.match(/^T(\d+)_(.+)$/);
    if (match) {
        const tier = match[1];
        const name = match[2].replace(/_/g, ' ');
        return `T${tier} ${name}`;
    }
    return itemId.replace(/_/g, ' ');
};

export const GuildTasks = ({ 
    guild,
    tasks, 
    isLoading, 
    onContribute, 
    expandedTasks, 
    toggleTaskExpanded,
    getItemAmount,
    timeUntilReset,
    isMobile
}) => {
    if (isLoading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent)' }}>LOADING TASKS...</div>;

    if (tasks?.locked) return (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Lock size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 'bold' }}>{tasks.message || "TASKS LOCKED"}</div>
        </div>
    );

    const libraryLevel = guild?.library_level || 1;
    const xpReward = GUILD_TASKS_CONFIG.REWARDS?.XP_TABLE?.[libraryLevel] || 0;
    const gpReward = GUILD_TASKS_CONFIG.REWARDS?.GP_TABLE?.[libraryLevel] || 0;

    if (!Array.isArray(tasks) || tasks.length === 0) return (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ClipboardList size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '15px' }} />
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 'bold' }}>No tasks available.</div>
        </div>
    );

    const taskLabelColor = '#ff3366'; // Reddish-pink from screenshot

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px' }}>
            {/* DAILY TASKS HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ color: taskLabelColor, margin: '0px', fontSize: '1rem', fontWeight: '900', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ClipboardList size={18} /> DAILY TASKS
                </h3>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '0.45rem', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', letterSpacing: '1px' }}>REWARD PER TASK:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Trophy size={11} color={taskLabelColor} />
                                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '900' }}>+{(xpReward || 0).toLocaleString()} XP</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ClipboardList size={11} color="#4488ff" />
                                <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: '900' }}>+{(gpReward || 0).toLocaleString()} GP</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Grid: Single Column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {tasks.map((task) => {
                    const targetAmount = task.target_amount || task.required || 1;
                    const currentAmount = task.current_amount || task.progress || 0;
                    const itemId = task.item_id || task.itemId;
                    const progressPct = Math.min(100, (currentAmount / targetAmount) * 100);
                    const isCompleted = currentAmount >= targetAmount;
                    const isExpanded = expandedTasks?.has(task.id);
                    
                    const cardBg = isCompleted ? 'rgba(68, 255, 68, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                    const cardBorder = isCompleted ? 'rgba(68, 255, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)';
                    const accentColor = isCompleted ? '#44ff44' : 'var(--accent)';

                    return (
                        <motion.div
                            key={task.id}
                            layout
                            style={{
                                background: cardBg,
                                borderRadius: '10px',
                                border: `1px solid ${cardBorder}`,
                                padding: '4px 8px',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: isCompleted ? 'rgba(68, 255, 68, 0.05) 0px 0px 15px' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                                <div style={{ width: '36px', height: '36px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.1)', flexShrink: 0, position: 'relative' }}>
                                    <img alt={itemId} src={getItemIcon(itemId)} style={{ width: '22px', height: '22px' }} />
                                    { !isCompleted && getItemAmount(itemId) > 0 && (
                                        <div style={{ 
                                            position: 'absolute', top: '-2px', right: '-2px', 
                                            width: '10px', height: '10px', background: '#44ff44', 
                                            borderRadius: '50%', border: '2px solid #000',
                                            boxShadow: '0 0 5px rgba(68, 255, 68, 0.5)'
                                        }} />
                                    )}
                                </div>
                                <div style={{ flex: '1 1 0%', minWidth: '0px' }}>
                                    <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {formatItemName(itemId, task.type)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 5 }}>
                                <button 
                                    onClick={() => toggleTaskExpanded(task.id)}
                                    style={{ width: '24px', height: '24px', background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                </button>
                                { !isCompleted && (
                                    <button 
                                        onClick={() => onContribute(task)}
                                        style={{ width: '24px', height: '24px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Progress Section */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginBottom: '4px', paddingRight: '28px' }}>
                                <div style={{ flex: '1 1 0%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.55rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2px', fontWeight: 'bold' }}>
                                        <span>{(currentAmount || 0).toLocaleString()} / {(targetAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPct}%` }}
                                            style={{ 
                                                height: '100%', 
                                                background: `linear-gradient(90deg, ${accentColor} 0%, #fff 100%)`, 
                                                boxShadow: `${accentColor}66 0px 0px 10px` 
                                            }} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Contributors List */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ overflow: 'hidden', marginTop: '10px', paddingBottom: '5px' }}
                                    >
                                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                            <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: '1px', marginBottom: '8px' }}>CONTRIBUTORS</div>
                                            {(!task.contributors || Object.keys(task.contributors).length === 0) ? (
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)', fontStyle: 'italic' }}>No contributions yet</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {Object.entries(task.contributors)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .map(([name, qty]) => (
                                                            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{name}</span>
                                                                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{(qty || 0).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
