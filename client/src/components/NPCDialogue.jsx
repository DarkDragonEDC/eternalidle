import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Check, ArrowRight, Coins, Zap, Trophy, Package, Navigation } from 'lucide-react';
import { QUESTS } from '@shared/quests';

const NPCDialogue = ({ npc, onClose }) => {
    const { gameState, questAccept, questClaim } = useAppStore();
    const navigate = useNavigate();

    if (!gameState) return null;

    const quests = gameState.state?.quests || { active: {}, completed: [] };
    const activeQuests = quests.active || {};
    const completedQuests = quests.completed || [];
    const npcIdUpper = npc.id.toUpperCase();

    // Find quests related to this NPC
    const availableQuests = Object.values(QUESTS)
        .filter(q => q.npcId === npcIdUpper)
        .filter(q => !activeQuests[q.id] && !completedQuests.includes(q.id))
        .filter(q => !q.reqQuest || completedQuests.includes(q.reqQuest));

    const currentActive = Object.values(activeQuests)
        .filter(q => {
            const qData = QUESTS[q.id];
            if (!qData) return q.npcId === npcIdUpper;
            
            // Match if:
            // 1. The quest belongs to this NPC
            // 2. OR the quest is a TALK quest and the goal is this NPC
            const isOwner = qData.npcId === npcIdUpper;
            const isTalkGoal = qData.type === 'TALK' && qData.goal?.npcId === npcIdUpper;
            
            return isOwner || isTalkGoal;
        });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10002,
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    background: 'var(--bg-dark)',
                    border: `1px solid ${npc.color}44`,
                    borderRadius: '24px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: `0 20px 50px -10px ${npc.color}22`
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '24px',
                    background: `linear-gradient(135deg, ${npc.color}11, transparent)`,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            border: `2px solid ${npc.color}44`,
                            background: npc.bg
                        }}>
                            <img 
                                src={`/npcs/${npc.image}`} 
                                alt={npc.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)' }}>{npc.name}</h2>
                            <span style={{ fontSize: '0.75rem', color: npc.color, fontWeight: '700', textTransform: 'uppercase' }}>{npc.title}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-dim)', padding: '8px' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="scroll-container" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {/* Active Quests (Ready to Claim) */}
                    {currentActive.filter(q => q.completed).map(q => (
                        <QuestSection 
                            key={q.id} 
                            quest={q} 
                            type="READY" 
                            color={npc.color} 
                            onAction={() => questClaim(q.id)} 
                            onClose={onClose}
                            navigate={navigate}
                        />
                    ))}

                    {/* Active Quests (In Progress) */}
                    {currentActive.filter(q => !q.completed).map(q => (
                        <QuestSection 
                            key={q.id} 
                            quest={q} 
                            type="ACTIVE" 
                            color={npc.color} 
                            progress={q.progress}
                            onClose={onClose}
                            navigate={navigate}
                        />
                    ))}

                    {/* Available Quests */}
                    {availableQuests.map(q => (
                        <QuestSection 
                            key={q.id} 
                            quest={q} 
                            type="AVAILABLE" 
                            color={npc.color} 
                            onAction={() => questAccept(q.id)} 
                            onClose={onClose}
                            navigate={navigate}
                        />
                    ))}

                    {availableQuests.length === 0 && currentActive.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)' }}>
                            <p>"It seems I have nothing for you at the moment, adventurer."</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const QuestSection = ({ quest, type, color, onAction, progress, onClose, navigate }) => {
    const isAvailable = type === 'AVAILABLE';
    const isReady = type === 'READY';
    const isActive = type === 'ACTIVE';

    const qData = QUESTS[quest.id] || quest;

    return (
        <div className="glass-panel" style={{
            padding: '20px',
            marginBottom: '16px',
            border: `1px solid ${isReady ? color : 'rgba(255,255,255,0.05)'}`,
            background: isReady ? `${color}08` : 'rgba(255,255,255,0.02)'
        }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>
                {qData.title}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: '1.5' }}>
                {qData.description}
            </p>

            {/* Rewards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                {qData.rewards?.silver && (
                    <RewardItem icon={<Coins size={14} />} color="#fbbf24" label={`${qData.rewards.silver.toLocaleString()}`} />
                )}
                {Object.entries(qData.rewards?.xp || {}).map(([skill, amount]) => (
                    <RewardItem key={skill} icon={<Zap size={14} />} color="#60a5fa" label={`${amount} XP ${skill}`} />
                ))}
                {Object.entries(qData.rewards?.items || {}).map(([id, qty]) => (
                    <RewardItem key={id} icon={<Package size={14} />} color="#a78bfa" label={`${qty}x ${id}`} />
                ))}
                {qData.rewards?.useClassEquipment && (
                    <RewardItem icon={<Package size={14} />} color="#f43f5e" label="Class Gear Set" />
                )}
                {qData.rewards?.useClassCraftXp && (
                    <RewardItem icon={<Zap size={14} />} color="#60a5fa" label={`${qData.rewards.useClassCraftXp.toLocaleString()} Class Craft XP`} />
                )}
                {qData.rewards?.useClassRefineXp && (
                    <RewardItem icon={<Zap size={14} />} color="#60a5fa" label={`${qData.rewards.useClassRefineXp.toLocaleString()} Class Refine XP`} />
                )}
                {qData.rewards?.useClassXp && (
                    <RewardItem icon={<Zap size={14} />} color="#60a5fa" label={`${qData.rewards.useClassXp.toLocaleString()} Class Gather XP`} />
                )}
                {qData.rewards?.useClassItems && (
                    <RewardItem icon={<Package size={14} />} color="#a78bfa" label={`${qData.rewards.useClassItems}x Class Resource`} />
                )}
                {qData.rewards?.useClassRefinedItems && (
                    <RewardItem icon={<Package size={14} />} color="#a78bfa" label={`${qData.rewards.useClassRefinedItems}x Class Refined`} />
                )}
                {qData.rewards?.proficiencyXp && (
                    <RewardItem icon={<Zap size={14} />} color="#60a5fa" label={`${qData.rewards.proficiencyXp.toLocaleString()} Weapon XP`} />
                )}
            </div>

            {/* Action */}
            {isAvailable && (
                <button 
                    onClick={onAction}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        background: color,
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    Accept Quest <ArrowRight size={18} />
                </button>
            )}

            {isReady && (
                <button 
                    onClick={onAction}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'var(--accent)',
                        color: 'var(--bg-dark)',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    Claim Reward <Check size={18} />
                </button>
            )}

            {isActive && (
                <div style={{ marginTop: '12px' }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '0.75rem', 
                        color: 'var(--text-dim)', 
                        marginBottom: '8px' 
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>In Progress</span>
                            <span>{progress} / {qData.goal?.count || 1}</span>
                        </div>

                        {qData.navigation && (
                            <button
                                onClick={() => {
                                    const { setActiveTab, setActiveCategory, setActiveTier, gameState } = useAppStore.getState();
                                    const nav = qData.navigation;
                                    const pClass = gameState?.state?.class;
                                    const weaponId = gameState?.state?.equipment?.mainHand?.id || '';
                                    let mappedClass = (gameState?.state?.class || '').toUpperCase();

                                    if (weaponId.includes('SWORD')) mappedClass = 'WARRIOR';
                                    else if (weaponId.includes('BOW')) mappedClass = 'HUNTER';
                                    else if (weaponId.includes('FIRE_STAFF')) mappedClass = 'MAGE';

                                    if (nav.tab) {
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

                                        if (onClose) onClose();
                                        if (navigate) navigate(`/${nav.tab}`);
                                    }
                                }}
                                style={{
                                    padding: '6px 12px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--text-main)',
                                    fontSize: '0.7rem',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <ArrowRight size={14} /> Go to Location
                            </button>
                        )}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${Math.min(100, (progress / (qData.goal.count || 1)) * 100)}%`, 
                            height: '100%', 
                            background: color,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
};

const RewardItem = ({ icon, color, label }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: `${color}15`,
        borderRadius: '8px',
        border: `1px solid ${color}33`,
        color: color,
        fontSize: '0.7rem',
        fontWeight: '700'
    }}>
        {icon}
        {label}
    </div>
);

export default NPCDialogue;
