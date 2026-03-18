import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { 
    Scroll, 
    Fish, 
    Hammer, 
    Sword, 
    ChevronRight, 
    CheckCircle2, 
    Circle,
    Info,
    Lock
} from 'lucide-react';
import NPCDialogue from '../components/NPCDialogue';
import { QUESTS, NPCS } from '@shared/quests';

const VillagePage = () => {
    const { gameState, questInteract } = useAppStore();
    const [selectedNpc, setSelectedNpc] = useState(null);

    const npcStates = gameState?.state?.quests?.npcTalked || {};
    const activeQuests = gameState?.state?.quests?.active || {};
    const completedQuests = gameState?.state?.quests?.completed || [];

    const npcs = [
        {
            id: 'elder',
            name: 'The Elder',
            title: 'Village Sage',
            image: 'elder.png',
            color: '#60a5fa',
            description: 'The keeper of wisdom. Start your journey here.',
        },
        {
            id: 'elara',
            name: 'Elara',
            title: 'Resource Expert',
            image: 'elara.png',
            color: '#4ade80',
            description: 'Master of gathering and natural resources.',
            requiredQuest: 'elder_talk_elara',
            prevNpc: 'The Elder'
        },
        {
            id: 'grog',
            name: 'Grog',
            title: 'Master Blacksmith',
            image: 'grog.png',
            color: '#fbbf24',
            description: 'The finest metalworker in the realm.',
            requiredQuest: 'elara_gathering',
            prevNpc: 'Elara'
        },
        {
            id: 'bryn',
            name: 'Bryn',
            title: 'Captain of the Guard',
            image: 'bryn.png',
            color: '#f87171',
            description: 'Ensuring village safety with strength.',
            requiredQuest: 'grog_equip',
            prevNpc: 'Grog'
        }
    ];

    const handleInteract = (npc) => {
        const isLocked = npc.requiredQuest && 
                       !completedQuests.includes(npc.requiredQuest) && 
                       !activeQuests[npc.requiredQuest];
        if (isLocked) return;
        
        setSelectedNpc(npc);
        questInteract(npc.id.toUpperCase());
    };

    return (
        <div className="page-container village-page scroll-container" style={{ padding: '24px', paddingBottom: '100px' }}>
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '32px' }}
            >
                <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-1px' }}>
                    Adventure Village
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '1rem', maxWidth: '600px' }}>
                    Speak with the residents to receive quests and advance your progression.
                </p>
            </motion.header>

            <div className="npc-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '24px'
            }}>
                {npcs.map((npc, index) => {
                    const npcIdUpper = npc.id.toUpperCase();
                    // NPC is locked if they have a requirement that is neither completed nor currently active
                    const isLocked = npc.requiredQuest && 
                                   !completedQuests.includes(npc.requiredQuest) && 
                                   !activeQuests[npc.requiredQuest];
                    
                    const hasActive = Object.values(activeQuests).some(q => q.npcId === npcIdUpper || QUESTS[q.id]?.npcId === npcIdUpper);
                    const hasReady = Object.values(activeQuests).some(q => (q.npcId === npcIdUpper || QUESTS[q.id]?.npcId === npcIdUpper) && q.completed);
                    
                    // Check if all quests for this NPC are completed
                    const npcData = NPCS[npcIdUpper];
                    const isAllCompleted = npcData?.quests?.length > 0 && npcData.quests.every(questId => completedQuests.includes(questId));
                    
                    return (
                        <motion.div
                            key={npc.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            onClick={() => handleInteract(npc)}
                            style={{
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                height: '400px',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                background: 'var(--bg-dark)',
                                border: `2px solid ${isAllCompleted ? '#10b981' : hasReady ? npc.color : isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)'}`,
                                boxShadow: isAllCompleted ? '0 0 30px rgba(16, 185, 129, 0.2)' : hasReady ? `0 0 30px ${npc.color}33` : '0 10px 30px rgba(0,0,0,0.5)',
                                opacity: isLocked ? 0.6 : 1,
                                filter: isLocked ? 'grayscale(0.8)' : 'none',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {/* NPC Portrait */}
                            <img 
                                src={`/npcs/${npc.image}`} 
                                alt={npc.name} 
                                style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    transition: 'transform 0.5s ease'
                                }}
                                className="npc-portrait"
                            />

                            {/* Gradient Overlay */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)'
                            }} />

                            {/* Status Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                zIndex: 2
                            }}>
                                {isAllCompleted && (
                                    <div style={{ 
                                        background: '#10b981',
                                        color: '#fff',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: '900',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        <CheckCircle2 size={14} /> Completed
                                    </div>
                                )}
                                {hasReady && !isAllCompleted && (
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        style={{ 
                                            background: npc.color,
                                            color: '#000',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '0.7rem',
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            boxShadow: `0 0 15px ${npc.color}`
                                        }}
                                    >
                                        <CheckCircle2 size={14} /> Ready
                                    </motion.div>
                                )}
                                {isLocked && (
                                    <div style={{ 
                                        background: 'rgba(0,0,0,0.8)',
                                        backdropFilter: 'blur(4px)',
                                        color: 'var(--text-dim)',
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <Lock size={12} /> Locked
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '24px',
                                zIndex: 1
                            }}>
                                <div style={{ 
                                    fontSize: '0.65rem', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '2px',
                                    color: npc.color,
                                    fontWeight: '900',
                                    marginBottom: '4px'
                                }}>
                                    {npc.title}
                                </div>
                                <h3 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>
                                    {npc.name}
                                </h3>
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: 'rgba(255,255,255,0.7)', 
                                    lineHeight: '1.4', 
                                    marginBottom: '16px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: '2',
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {npc.description}
                                </p>
                                
                                <button 
                                    disabled={isLocked}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: isLocked ? 'rgba(255,255,255,0.05)' : isAllCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: isAllCompleted ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                        color: isLocked ? 'var(--text-dim)' : isAllCompleted ? '#10b981' : '#fff',
                                        fontWeight: '800',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s ease',
                                        cursor: isLocked ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isLocked ? `Complete ${npc.prevNpc}` : isAllCompleted ? 'Finished' : 'Interact'} {!isLocked && !isAllCompleted && <ChevronRight size={18} />} {isAllCompleted && <CheckCircle2 size={18} />}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {selectedNpc && (
                    <NPCDialogue 
                        npc={selectedNpc} 
                        onClose={() => setSelectedNpc(null)} 
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default VillagePage;
