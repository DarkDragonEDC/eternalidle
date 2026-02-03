import React from 'react';
import { Pickaxe, Box, Hammer, Sword, Castle, Trophy, ShoppingBag } from 'lucide-react';

const HubButton = ({ label, icon, onClick, color = 'var(--text-main)' }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '20px', background: 'var(--panel-bg)', border: '1px solid var(--border)',
            borderRadius: '12px', width: '100%', aspectRatio: '1/1', gap: '10px',
            cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
    >
        <div style={{ color: color }}>{React.cloneElement(icon, { size: 32 })}</div>
        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-main)' }}>{label}</span>
    </button>
);

export const SkillsOverview = ({ onNavigate }) => {
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
                { id: 'PLANK', label: 'Lumber Mill' },
                { id: 'BAR', label: 'Smelting' },
                { id: 'LEATHER', label: 'Tannery' },
                { id: 'CLOTH', label: 'Loom' },
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
                                {cat.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => onNavigate(cat.id, item.id)}
                                        style={{
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '8px',
                                            color: 'var(--text-dim)',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: '0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                            e.currentTarget.style.color = 'var(--text-main)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            e.currentTarget.style.color = 'var(--text-dim)';
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
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

export const CombatOverview = ({ onNavigate }) => (
    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignContent: 'start' }}>
        <HubButton label="Adventure" icon={<Sword />} color="#ef4444" onClick={() => onNavigate('combat')} />
        <HubButton label="Dungeons" icon={<Castle />} color="#94a3b8" onClick={() => onNavigate('dungeon')} />
    </div>
);
