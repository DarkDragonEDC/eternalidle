import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { ClipboardList, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { QUESTS } from '@shared/quests';

const QuestTracker = () => {
    const { gameState, setActiveTab } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    if (!gameState) return null;

    const activeQuests = Object.values(gameState?.state?.quests?.active || {});
    const readyToClaimCount = activeQuests.filter(q => q.completed).length;

    if (activeQuests.length === 0) return null;

    return (
        <div style={{ position: 'relative' }} data-quest-tracker>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: readyToClaimCount > 0 ? 'rgba(74, 222, 128, 0.1)' : 'var(--slot-bg)',
                    border: `1px solid ${readyToClaimCount > 0 ? '#4ade8055' : 'var(--border)'}`,
                    borderRadius: '8px',
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: '0.2s',
                    position: 'relative'
                }}
            >
                <ClipboardList size={16} color={readyToClaimCount > 0 ? '#4ade80' : 'var(--text-dim)'} />
                {!readyToClaimCount && <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{activeQuests.length} Quests</span>}
                {readyToClaimCount > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4ade80', whiteSpace: 'nowrap' }}>{readyToClaimCount} Ready!</span>}
                
                <ChevronDown size={14} color="var(--text-dim)" style={{
                    transition: '0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6
                }} />

                {readyToClaimCount > 0 && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '8px',
                            height: '8px',
                            background: '#4ade80',
                            borderRadius: '50%',
                            boxShadow: '0 0 8px #4ade80'
                        }}
                    />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{
                            position: 'absolute',
                            top: '120%',
                            right: 0,
                            width: '260px',
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border-active)',
                            borderRadius: '16px',
                            padding: '16px',
                            zIndex: 5002,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <div style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>
                            Active Quests
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {activeQuests.map(quest => {
                                const qData = QUESTS[quest.id] || quest;
                                const isDone = quest.completed;
                                const progress = quest.progress || 0;
                                const goal = qData.goal?.count || 1;
                                const percent = Math.min(100, (progress / goal) * 100);

                                return (
                                    <div key={quest.id} style={{ 
                                        opacity: isDone ? 1 : 0.8,
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                                            {isDone ? 
                                                <CheckCircle2 size={14} color="#4ade80" style={{ marginTop: '2px' }} /> : 
                                                <Circle size={14} color="var(--text-dim)" style={{ marginTop: '2px' }} />
                                            }
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: isDone ? '#4ade80' : 'var(--text-main)', lineHeight: '1.2' }}>
                                                    {qData.title || quest.id}
                                                </div>
                                                {!isDone && qData.goal?.count && (
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                        {progress} / {goal}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Go Button */}
                                            {!isDone && qData.navigation && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const nav = qData.navigation;
                                                        const pClass = gameState?.state?.class;
                                                        const weaponId = gameState?.state?.equipment?.mainHand?.id || '';
                                                        let mappedClass = (gameState?.state?.class || '').toUpperCase();

                                                        if (weaponId.includes('SWORD')) mappedClass = 'WARRIOR';
                                                        else if (weaponId.includes('BOW')) mappedClass = 'HUNTER';
                                                        else if (weaponId.includes('FIRE_STAFF')) mappedClass = 'MAGE';

                                                        if (nav.tab) {
                                                            const { setActiveCategory, setActiveTier } = useAppStore.getState();
                                                            
                                                            setActiveTab(nav.tab);
                                                            
                                                            if (nav.category) setActiveCategory(nav.category);
                                                            else if (nav.useClass) {
                                                                if (nav.tab === 'gathering') {
                                                                    if (mappedClass === 'WARRIOR') setActiveCategory('ORE');
                                                                    else if (mappedClass === 'HUNTER') setActiveCategory('HIDE');
                                                                    else if (mappedClass === 'MAGE') setActiveCategory('FIBER');
                                                                } else if (nav.tab === 'refining') {
                                                                    if (mappedClass === 'WARRIOR') setActiveCategory('BAR');
                                                                    else if (mappedClass === 'HUNTER') setActiveCategory('LEATHER');
                                                                    else if (mappedClass === 'MAGE') setActiveCategory('CLOTH');
                                                                } else if (nav.tab === 'crafting') {
                                                                    if (mappedClass === 'WARRIOR') setActiveCategory('WARRIORS_FORGE');
                                                                    else if (mappedClass === 'HUNTER') setActiveCategory('HUNTERS_LODGE');
                                                                    else if (mappedClass === 'MAGE') setActiveCategory('MAGES_TOWER');
                                                                }
                                                            }

                                                            if (nav.tier) setActiveTier(nav.tier);

                                                            navigate(`/${nav.tab}`);
                                                            setIsOpen(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: 'var(--accent)',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '0.6rem',
                                                        color: '#000',
                                                        fontWeight: '900',
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase'
                                                    }}
                                                >
                                                    Go
                                                </button>
                                            )}
                                        </div>
                                        
                                        {!isDone && (
                                            <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percent}%` }}
                                                    style={{ height: '100%', background: 'var(--accent)' }} 
                                                />
                                            </div>
                                        )}

                                        {isDone && (
                                            <div style={{ fontSize: '0.6rem', color: '#4ade80', fontWeight: '800' }}>
                                                READY TO CLAIM
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => { 
                                setIsOpen(false); 
                                setActiveTab('village');
                                navigate('/village');
                            }}
                            style={{ 
                                width: '100%', 
                                marginTop: '16px', 
                                padding: '8px', 
                                border: '1px solid rgba(255,255,255,0.05)', 
                                borderRadius: '8px', 
                                fontSize: '0.7rem', 
                                color: 'var(--text-dim)',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            GO TO VILLAGE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuestTracker;
