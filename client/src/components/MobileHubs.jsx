import React from 'react';
import { Pickaxe, Box, Hammer, Sword, Castle, Trophy, ShoppingBag, Zap, Coins, Gift, ArrowLeftRight, Skull, Lock } from 'lucide-react';

const HubButton = ({ label, icon, onClick, color = 'var(--text-main)', level, progress, showBadge, customStyle = {} }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
            padding: '16px 20px', background: 'var(--panel-bg)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '100%', gap: '15px',
            cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            ...customStyle
        }}
    >
        <div style={{ color: color, display: 'flex', position: 'relative' }}>
            {React.cloneElement(icon, { size: 28 })}
            {showBadge && (
                <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '10px',
                    height: '10px',
                    background: '#ff4444',
                    borderRadius: '50%',
                    border: '1.5px solid var(--panel-bg)',
                    boxShadow: '0 0 5px rgba(255, 68, 68, 0.5)'
                }} />
            )}
        </div>
        <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>{label}</span>
            {level !== undefined && (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--accent)',
                        background: 'var(--glass-bg)',
                        padding: '1px 6px',
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
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 'normal',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {Math.floor(progress)}%
                        </div>
                    )}
                </div>
            )}
        </div>
        <div style={{ color: 'var(--text-dim)', opacity: 0.3 }}>
            <Zap size={18} />
        </div>
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
    const categories = [
        {
            id: 'gathering',
            label: 'Gather',
            icon: <Pickaxe size={14} />,
            color: '#4ade80',
            items: [
                { id: 'WOOD', label: 'Lumberjack' },
                { id: 'ORE', label: 'Mining' },
                { id: 'HIDE', label: 'Skinning' },
                { id: 'FIBER', label: 'Harvesting' },
                { id: 'HERB', label: 'Herbalism' },
                { id: 'FISH', label: 'Fishing' }
            ]
        },
        {
            id: 'refining',
            label: 'Refine',
            icon: <Box size={14} />,
            color: '#60a5fa',
            items: [
                { id: 'PLANK', label: 'Lumber Mill' },
                { id: 'BAR', label: 'Smelting' },
                { id: 'LEATHER', label: 'Tannery' },
                { id: 'CLOTH', label: 'Loom' },
                { id: 'EXTRACT', label: 'Distillation' },
                { id: 'RUNE_FORGE', label: 'Rune Forge', isSpecial: true }
            ]
        },
        {
            id: 'crafting',
            label: 'Craft',
            icon: <Hammer size={14} />,
            color: '#f472b6',
            items: [
                { id: 'TOOLMAKER', label: 'Toolmaker' },
                { id: 'WARRIORS_FORGE', label: 'Warrior' },
                { id: 'HUNTERS_LODGE', label: 'Hunter' },
                { id: 'MAGES_TOWER', label: 'Mage' },
                { id: 'ALCHEMY_LAB', label: 'Alchemy' },
                { id: 'COOKING_STATION', label: 'Kitchen' }
            ]
        }
    ];

    return (
        <div style={{ padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                alignItems: 'start'
            }}>
                {categories.map((cat) => (
                    <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Compact Column Header */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 2px',
                            borderRadius: '8px',
                            background: 'var(--glass-bg)',
                            border: `1px solid ${cat.color}33`
                        }}>
                            <div style={{ color: cat.color }}>{cat.icon}</div>
                            <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                color: cat.color,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {cat.label}
                            </span>
                        </div>

                        {/* Vertical Skill List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {cat.items.map((item) => {
                                const skillKey = mapTabCategoryToSkill(cat.id, item.id);
                                const skill = gameState?.state?.skills?.[skillKey];
                                const level = skill?.level || 1;
                                const nextXP = calculateNextLevelXP(level);
                                const progress = level >= 100 ? 100 : Math.min(100, ((skill?.xp || 0) / nextXP) * 100);

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => item.isSpecial ? onNavigate('merging', 'RUNE') : onNavigate(cat.id, item.id)}
                                        style={{
                                            position: 'relative',
                                            padding: '6px 2px',
                                            background: item.isSpecial ? 'var(--accent-soft)' : 'var(--panel-bg)',
                                            border: item.isSpecial ? '1px solid var(--accent)' : '1px solid var(--border)',
                                            borderRadius: '6px',
                                            color: item.isSpecial ? 'var(--accent)' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: '0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '2px',
                                            overflow: 'hidden',
                                            minHeight: '45px',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <div style={{
                                            fontSize: '1rem',
                                            fontWeight: 'bold',
                                            color: item.isSpecial ? 'var(--accent)' : 'var(--text-main)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            width: '100%',
                                            lineHeight: '1.2'
                                        }}>
                                            {item.label}
                                        </div>

                                        {!item.isSpecial && (
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: cat.color, fontWeight: 'bold' }}>
                                                    L{level}
                                                </div>
                                                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', opacity: 0.7 }}>
                                                    {Math.floor(progress)}%
                                                </div>
                                            </div>
                                        )}

                                        {/* Background Progress Indicator */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            height: '100%',
                                            width: `${progress}%`,
                                            background: cat.color,
                                            opacity: 0.05,
                                            pointerEvents: 'none'
                                        }} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export const TownOverview = ({ onNavigate, gameState, canSpin, onOpenDailySpin, hasActiveTrade, isAnonymous, onShowGuestModal }) => {
    const hasClaims = gameState?.state?.claims?.length > 0;

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(canSpin || isAnonymous) && (
                <HubButton
                    label={isAnonymous ? "Save to Spin" : "Daily Gift"}
                    icon={isAnonymous ? <Lock /> : <Gift />}
                    color={isAnonymous ? "var(--text-dim)" : "#fff"}
                    onClick={() => {
                        if (isAnonymous) {
                            onShowGuestModal();
                            return;
                        }
                        onOpenDailySpin();
                    }}
                    showBadge={!isAnonymous}
                    customStyle={{
                        background: isAnonymous
                            ? 'var(--panel-bg)'
                            : 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)',
                        border: isAnonymous ? '1px solid var(--border)' : '1px solid #ffd700',
                        boxShadow: isAnonymous ? 'none' : '0 0 15px rgba(255, 215, 0, 0.3)',
                        opacity: isAnonymous ? 0.7 : 1
                    }}
                />
            )}
            <HubButton
                label="Market"
                icon={isAnonymous ? <Lock /> : <ShoppingBag />}
                color={isAnonymous ? "var(--text-dim)" : "#fbbf24"}
                onClick={() => {
                    if (isAnonymous) {
                        onShowGuestModal();
                        return;
                    }
                    onNavigate('market');
                }}
                showBadge={hasClaims && !isAnonymous}
                customStyle={isAnonymous ? { opacity: 0.7 } : {}}
            />
            <HubButton
                label="Social"
                icon={isAnonymous ? <Lock /> : <ArrowLeftRight />}
                color={isAnonymous ? "var(--text-dim)" : "#8b5cf6"}
                onClick={() => {
                    if (isAnonymous) {
                        onShowGuestModal();
                        return;
                    }
                    onNavigate('trade');
                }}
                showBadge={hasActiveTrade && !isAnonymous}
                customStyle={isAnonymous ? { opacity: 0.7 } : {}}
            />
            <HubButton label="Ranking" icon={<Trophy />} color="#a78bfa" onClick={() => onNavigate('ranking')} />
            <HubButton label="Taxometer" icon={<Coins />} color="var(--accent)" onClick={() => onNavigate('taxometer')} />
        </div>
    );
};

import { MONSTERS } from '@shared/monsters';
import { formatNumber } from '@utils/format';

export const CombatOverview = ({ onNavigate, gameState }) => {
    const combatSkill = gameState?.state?.skills?.COMBAT || { level: 1, xp: 0 };
    const dungeonSkill = gameState?.state?.skills?.DUNGEONEERING || { level: 1, xp: 0 };

    const combatLevel = combatSkill.level;
    const combatNextXP = calculateNextLevelXP(combatLevel);
    const combatProgress = combatLevel >= 100 ? 100 : (combatSkill.xp / combatNextXP) * 100;

    const dungeonLevel = dungeonSkill.level;
    const dungeonNextXP = calculateNextLevelXP(dungeonLevel);
    const dungeonProgress = dungeonLevel >= 100 ? 100 : (dungeonSkill.xp / dungeonNextXP) * 100;

    // Determine Adventure Button Icon
    let adventureIcon = <Sword />;
    let adventureLabel = "Adventure";

    // Determine Floating Icon (Simpler Logic)
    let floatingIcon = <Skull size={24} color="#ff4444" strokeWidth={2} />;

    const combatState = gameState?.state?.combat;

    if (combatState && combatState.mobId) {
        // More robust lookup
        const tier = Number(combatState.tier) || 1;
        const mobId = combatState.mobId;

        const mobList = MONSTERS[tier];
        const mob = mobList?.find(m => m.id === mobId);

        if (mob) {
            adventureLabel = `Fight: ${mob.name}`;

            // Revert Adventure Button Icon (as per user request) to default Sword
            // But we can keep the label change to show who we are fighting.

            // Explicit Floating Icon Logic
            if (mob.image) {
                floatingIcon = (
                    <img
                        src={`/monsters/${mob.image}?v=2`}
                        alt={mob.name}
                        style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                    />
                );
            }
        }
    }

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <HubButton
                label={adventureLabel}
                icon={adventureIcon}
                color="#ef4444"
                onClick={() => onNavigate('combat')}
                level={combatLevel}
                progress={combatProgress}
            />

            {/* Floating Combat Button (User Request) - REMOVED (Now handled globally by ActivityWidget) */}

            <HubButton
                label="Dungeons"
                icon={<Castle />}
                color="#94a3b8"
                onClick={() => onNavigate('dungeon')}
                level={dungeonLevel}
                progress={dungeonProgress}
            />
            <HubButton
                label="World Boss"
                icon={<Skull />}
                color="#a855f7"
                onClick={() => onNavigate('world_boss')}
                customStyle={{ border: '1px solid #a855f7', background: 'rgba(168, 85, 247, 0.05)' }}
            />
        </div>
    );
};
