import React from 'react';
import { Pickaxe, Box, Hammer, Sword, Castle, Trophy, ShoppingBag, Zap } from 'lucide-react';

const HubButton = ({ label, icon, onClick, color = 'var(--text-main)', level, progress }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px', background: 'var(--panel-bg)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '100%', aspectRatio: '1/1', gap: '8px',
            cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
    >
        <div style={{ color: color }}>{React.cloneElement(icon, { size: 32 })}</div>
        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>{label}</span>
        {level !== undefined && (
            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                <div style={{
                    fontSize: '0.7rem',
                    color: 'var(--accent)',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    border: '1px solid var(--accent-soft)'
                }}>
                    Lv {level}
                </div>
                {progress !== undefined && (
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 'normal',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {Math.floor(progress)}%
                    </div>
                )}
            </div>
        )}
    </button>
);

import { calculateNextLevelXP } from '@shared/skills';

const mapTabCategoryToSkill = (tab, category) => {
    const maps = {
        gathering: {
            WOOD: 'LUMBERJACK',
            ORE: 'ORE_MINER',
            HIDE: 'ANIMAL_SKINNER',
            FIBER: 'FIBER_HARVESTER',
            FISH: 'FISHING',
            HERB: 'HERBALISM'
        },
        refining: {
            PLANK: 'PLANK_REFINER',
            BAR: 'METAL_BAR_REFINER',
            LEATHER: 'LEATHER_REFINER',
            CLOTH: 'CLOTH_REFINER',
            EXTRACT: 'DISTILLATION'
        },
        crafting: {
            WARRIORS_FORGE: 'WARRIOR_CRAFTER',
            HUNTERS_LODGE: 'HUNTER_CRAFTER',
            MAGES_TOWER: 'MAGE_CRAFTER',
            COOKING_STATION: 'COOKING',
            ALCHEMY_LAB: 'ALCHEMY',
            TOOLMAKER: 'TOOL_CRAFTER'
        },
        merging: {
            RUNE: 'RUNE'
        }
    };
    return maps[tab.toLowerCase()]?.[category.toUpperCase()];
};

export const SkillsOverview = ({ onNavigate, gameState }) => {
    const [expanded, setExpanded] = React.useState(null);

    const toggleExpand = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const categories = [
        {
            id: 'gathering',
            label: 'Gathering',
            icon: <Pickaxe />,
            color: '#4ade80',
            items: [
                { id: 'WOOD', label: 'Lumberjack' },
                { id: 'ORE', label: 'Mining' },
                { id: 'HIDE', label: 'Skinning' },
                { id: 'FIBER', label: 'Harvesting' },
                { id: 'FISH', label: 'Fishing' },
                { id: 'HERB', label: 'Herbalism' }
            ]
        },
        {
            id: 'refining',
            label: 'Refining',
            icon: <Box />,
            color: '#60a5fa',
            items: [
                { id: 'PLANK', label: 'Lumberjack' },
                { id: 'BAR', label: 'Mining' },
                { id: 'LEATHER', label: 'Skinning' },
                { id: 'CLOTH', label: 'Harvesting' },
                { id: 'EXTRACT', label: 'Distillation' }
            ]
        },
        {
            id: 'crafting',
            label: 'Crafting',
            icon: <Hammer />,
            color: '#f472b6',
            items: [
                { id: 'WARRIORS_FORGE', label: "Warrior's Forge" },
                { id: 'HUNTERS_LODGE', label: "Hunter's Lodge" },
                { id: 'MAGES_TOWER', label: "Mage's Tower" },
                { id: 'TOOLMAKER', label: 'Toolmaker' },
                { id: 'COOKING_STATION', label: 'Kitchen' },
                { id: 'ALCHEMY_LAB', label: 'Alchemy Lab' }
            ]
        },
        {
            id: 'merging',
            label: 'Merging',
            icon: <Zap size={18} />,
            color: 'var(--accent)',
            items: [
                { id: 'RUNE', label: 'Rune' }
            ]
        }
    ];

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {categories.map((cat) => {
                const isExpanded = expanded === cat.id;
                return (
                    <div key={cat.id} style={{
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <button
                            onClick={() => toggleExpand(cat.id)}
                            style={{
                                width: '100%',
                                padding: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                background: isExpanded ? 'var(--accent-soft)' : 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                transition: '0.2s',
                                textAlign: 'left'
                            }}
                        >
                            <div style={{
                                color: cat.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '8px'
                            }}>
                                {React.cloneElement(cat.icon, { size: 24 })}
                            </div>
                            <span style={{
                                flex: 1,
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: isExpanded ? 'var(--accent)' : 'var(--text-main)',
                                letterSpacing: '1px'
                            }}>
                                {cat.label}
                            </span>
                            <div style={{
                                color: isExpanded ? 'var(--accent)' : 'var(--text-dim)',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s'
                            }}>
                                ▼
                            </div>
                        </button>

                        <div style={{
                            height: isExpanded ? 'auto' : '0',
                            overflow: 'hidden',
                            transition: 'height 0.3s ease'
                        }}>
                            <div style={{ padding: '5px 15px 15px 15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {cat.items.map((item) => {
                                    const skillKey = mapTabCategoryToSkill(cat.id, item.id);
                                    const skill = gameState?.state?.skills?.[skillKey];
                                    const level = skill?.level || 1;
                                    const nextXP = calculateNextLevelXP(level);
                                    const progress = Math.min(100, ((skill?.xp || 0) / nextXP) * 100);

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onNavigate(cat.id, item.id)}
                                            style={{
                                                padding: '12px',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                borderRadius: '8px',
                                                color: 'var(--text-main)',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: '0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                e.currentTarget.style.borderColor = 'var(--accent-soft)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                            }}
                                        >
                                            <div style={{ color: 'var(--text-main)' }}>{item.label}</div>
                                            {skillKey !== 'RUNE' && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        color: 'var(--accent)',
                                                        background: 'rgba(0,0,0,0.3)',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        fontWeight: 'bold',
                                                        border: '1px solid var(--accent-soft)'
                                                    }}>
                                                        Lv {level}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        color: 'var(--text-dim)',
                                                        background: 'rgba(255,255,255,0.05)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 'normal',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}>
                                                        {Math.floor(progress)}%
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const TownOverview = ({ onNavigate }) => (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignContent: 'start' }}>
        <HubButton label="Market" icon={<ShoppingBag />} color="#fbbf24" onClick={() => onNavigate('market')} />
        <HubButton label="Ranking" icon={<Trophy />} color="#a78bfa" onClick={() => onNavigate('ranking')} />
    </div>
);

export const CombatOverview = ({ onNavigate, gameState }) => {
    const skill = gameState?.state?.skills?.COMBAT || { level: 1, xp: 0 };
    const level = skill.level;
    const nextXP = calculateNextLevelXP(level);
    const progress = (skill.xp / nextXP) * 100;

    return (
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignContent: 'start' }}>
            <HubButton
                label="Adventure"
                icon={<Sword />}
                color="#ef4444"
                onClick={() => onNavigate('combat')}
                level={level}
                progress={progress}
            />
            <HubButton
                label="Dungeons"
                icon={<Castle />}
                color="#94a3b8"
                onClick={() => onNavigate('dungeon')}
                level={level}
                progress={progress}
            />
        </div>
    );
};
