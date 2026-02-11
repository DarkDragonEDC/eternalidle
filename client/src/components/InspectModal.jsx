import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sword, Shield, Heart, Zap, User, Star, Layers, Info, Award, Crosshair, Hammer, Pickaxe, Flame, Droplets, Wind, Sparkles, Scissors, Anchor, ShoppingBag, Apple, Target, ChevronRight } from 'lucide-react';
import { resolveItem, calculateRuneBonus } from '@shared/items';
import { calculateNextLevelXP } from '@shared/skills';

const InspectModal = React.memo(({ data, onClose, onItemClick }) => {
    const [activeTab, setActiveTab] = useState('EQUIPMENT'); // EQUIPMENT | SKILLS
    const [expandedCategory, setExpandedCategory] = useState(null);

    const { name, level, selectedTitle, health = 0, equipment = {}, skills = {}, stats = {}, isPremium, guildName } = data;

    const totalIP = Math.floor(Object.values(equipment).reduce((acc, item) => {
        if (!item) return acc;
        return acc + (resolveItem(item.id || item.item_id)?.ip || 0);
    }, 0) / 7);

    const totalLevel = Object.values(skills).reduce((acc, s) => acc + (s.level || 0), 0);

    const EquipmentSlot = ({ slot, icon, label, item: rawItem, delay = 0 }) => {
        const item = rawItem ? { ...rawItem, ...resolveItem(rawItem.id || rawItem.item_id) } : null;
        const rarityColor = item && item.rarityColor ? item.rarityColor : 'rgba(255,255,255,0.05)';
        const glowColor = item ? `${rarityColor}33` : 'transparent';

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(0,0,0,0.4)',
                    border: `2px solid ${item ? rarityColor : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    boxShadow: item ? `0 0 15px ${glowColor}` : 'none',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(4px)',
                }}>
                    {item && (
                        <div style={{ position: 'absolute', top: 3, left: 5, fontSize: '0.6rem', fontWeight: '900', color: rarityColor, opacity: 0.8 }}>
                            T{item.tier}
                        </div>
                    )}
                    {item && item.stars > 0 && (
                        <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: '1px' }}>
                            {[...Array(item.stars)].map((_, i) => (
                                <Star key={i} size={8} fill={rarityColor} stroke={rarityColor} />
                            ))}
                        </div>
                    )}
                    <div style={{ opacity: item ? 0.3 : 0.1, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {icon}
                    </div>

                    {item && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onItemClick(item);
                            }}
                            style={{
                                position: 'absolute',
                                bottom: 4,
                                right: 4,
                                cursor: 'pointer',
                                opacity: 0.4,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: '0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.opacity = 1}
                            onMouseOut={e => e.currentTarget.style.opacity = 0.4}
                        >
                            <Info size={11} />
                        </div>
                    )}
                </div>
                <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                    {label}
                </span>
            </motion.div>
        );
    };

    const SkillCategory = ({ title, icon, skillsList, color, isExpanded, onToggle }) => {
        return (
            <div style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div
                    onClick={onToggle}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                        transition: '0.3s'
                    }}
                >
                    <div style={{ color, display: 'flex', alignItems: 'center' }}>{React.cloneElement(icon, { size: 18 })}</div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fff', letterSpacing: '1px', textTransform: 'uppercase', flex: 1 }}>{title}</span>
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <ChevronRight size={18} />
                    </motion.div>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 16px 16px 16px' }}>
                                {skillsList.map(sId => {
                                    const skill = skills[sId] || { level: 1, xp: 0 };
                                    const nextXP = calculateNextLevelXP(skill.level);
                                    const progress = skill.level >= 100 ? 100 : Math.min(100, (skill.xp / nextXP) * 100);
                                    return (
                                        <div key={sId} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                    {sId.replace(/_/g, ' ')}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '900' }}>
                                                    <span style={{ fontSize: '0.55rem', opacity: 0.4, marginRight: '4px' }}>LV</span>
                                                    {skill.level}
                                                </span>
                                            </div>
                                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    style={{ height: '100%', background: color, boxShadow: `0 0 10px ${color}66` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(12px)',
                zIndex: 4000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
            {/* Background Decor */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)', opacity: 0.1, pointerEvents: 'none' }} />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                style={{
                    background: 'rgba(18, 18, 22, 0.95)',
                    border: isPremium ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '32px',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: isPremium ? '0 0 50px rgba(212, 175, 55, 0.2)' : '0 30px 60px rgba(0,0,0,0.6)',
                    position: 'relative'
                }}
            >
                {/* Header Banner */}
                <div style={{
                    padding: '25px 25px 15px 25px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: 15, right: 15, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', zIndex: 10 }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,0,0,0.2)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    >
                        <X size={18} />
                    </button>

                    <motion.div
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        style={{
                            fontSize: '0.65rem',
                            fontWeight: '950',
                            letterSpacing: '3px',
                            textTransform: 'uppercase',
                            color: isPremium ? '#d4af37' : 'var(--accent)',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        {isPremium && <Award size={12} />}
                        {selectedTitle || 'GLORIOUS EXPLORER'}
                        {isPremium && <Award size={12} />}
                    </motion.div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        marginTop: '10px'
                    }}>
                        {/* Level Indicator (Left) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '950', color: '#fff', lineHeight: 1 }}>{totalLevel}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>LVL</div>
                        </div>

                        <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.1)', letterSpacing: '-0.5px', lineHeight: 1 }}>{name}</h2>

                        {/* Power Indicator (Right) */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '950', color: isPremium ? '#d4af37' : 'var(--accent)', lineHeight: 1 }}>{totalIP}</div>
                            <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>PWR</div>
                        </div>
                    </div>

                    {guildName && (
                        <div style={{
                            fontSize: '0.8rem',
                            color: '#4ade80',
                            fontWeight: 'bold',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <span style={{ opacity: 0.4 }}>‹</span>
                            {guildName}
                            <span style={{ opacity: 0.4 }}>›</span>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', padding: '0 30px', gap: '8px', marginTop: '10px', justifyContent: 'center' }}>
                    {['EQUIPMENT', 'SKILLS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 20px', border: 'none',
                                background: activeTab === tab ? 'rgba(255,255,255,0.06)' : 'transparent',
                                borderRadius: '10px',
                                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                                fontWeight: '900', fontSize: '0.7rem', cursor: 'pointer',
                                letterSpacing: '1.5px',
                                transition: '0.3s',
                                border: activeTab === tab ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                                minWidth: '110px'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 25px', position: 'relative' }}>
                    {activeTab === 'EQUIPMENT' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            {/* HP Bar */}
                            <div style={{ marginBottom: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '8px', fontWeight: '900', letterSpacing: '1px', color: '#888' }}>
                                    <span>VITALITY</span>
                                    <span style={{ color: '#fff' }}>{Math.floor(health)} / {Math.floor(stats.maxHP || 100)} HP</span>
                                </div>
                                <div style={{ background: 'rgba(255, 0, 0, 0.05)', height: '6px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 0, 0, 0.1)' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (health / (stats.maxHP || 100)) * 100)}%` }}
                                        style={{ height: '100%', background: 'linear-gradient(90deg, #ff4d4d, #b30000)' }}
                                    />
                                </div>
                            </div>

                            {/* Compact Grid Layout */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, auto)',
                                gap: '15px',
                                justifyContent: 'center',
                                padding: '10px 0'
                            }}>
                                <EquipmentSlot slot="cape" icon={<Layers size={20} />} label="CAPE" item={equipment.cape} delay={0.05} />
                                <EquipmentSlot slot="helmet" icon={<User size={20} />} label="HEAD" item={equipment.helmet} delay={0.1} />
                                <EquipmentSlot slot="food" icon={<Apple size={20} />} label="FOOD" item={equipment.food} delay={0.15} />

                                <EquipmentSlot slot="gloves" icon={<Shield size={20} />} label="HANDS" item={equipment.gloves} delay={0.2} />
                                <EquipmentSlot slot="chest" icon={<Shield size={20} />} label="CHEST" item={equipment.chest} delay={0.25} />
                                <EquipmentSlot slot="offHand" icon={<Target size={20} />} label="OFF-HAND" item={equipment.offHand} delay={0.3} />

                                <EquipmentSlot slot="mainHand" icon={<Sword size={20} />} label="WEAPON" item={equipment.mainHand} delay={0.35} />
                                <EquipmentSlot slot="boots" icon={<Target size={20} />} label="FEET" item={equipment.boots} delay={0.4} />

                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    border: '2px dashed rgba(255,255,255,0.05)',
                                    borderRadius: '12px',
                                    background: 'rgba(0,0,0,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>LOCKED</div>
                                </div>
                            </div>

                            {/* Tools Section */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                                <h4 style={{ color: 'var(--accent)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '15px', textAlign: 'center', letterSpacing: '2px', fontWeight: '900', opacity: 0.6 }}>Gathering Tools</h4>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}>
                                    <EquipmentSlot slot="tool_axe" icon={<Pickaxe size={18} />} label="AXE" item={equipment.tool_axe} delay={0.45} />
                                    <EquipmentSlot slot="tool_pickaxe" icon={<Pickaxe size={18} />} label="PICK" item={equipment.tool_pickaxe} delay={0.5} />
                                    <EquipmentSlot slot="tool_sickle" icon={<Scissors size={18} />} label="SICKLE" item={equipment.tool_sickle} delay={0.55} />
                                    <EquipmentSlot slot="tool_knife" icon={<Sword size={18} style={{ transform: 'rotate(45deg)' }} />} label="KNIFE" item={equipment.tool_knife} delay={0.6} />
                                    <EquipmentSlot slot="tool_rod" icon={<Anchor size={18} />} label="ROD" item={equipment.tool_rod} delay={0.65} />
                                    <EquipmentSlot slot="tool_pouch" icon={<ShoppingBag size={18} />} label="POUCH" item={equipment.tool_pouch} delay={0.7} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <SkillCategory
                                title="Gathering"
                                icon={<Pickaxe />}
                                color="#4ade80"
                                skillsList={['LUMBERJACK', 'ORE_MINER', 'ANIMAL_SKINNER', 'FIBER_HARVESTER', 'FISHING', 'HERBALISM']}
                                isExpanded={expandedCategory === 'gathering'}
                                onToggle={() => setExpandedCategory(expandedCategory === 'gathering' ? null : 'gathering')}
                            />
                            <SkillCategory
                                title="Refining"
                                icon={<Flame />}
                                color="#60a5fa"
                                skillsList={['PLANK_REFINER', 'METAL_BAR_REFINER', 'LEATHER_REFINER', 'CLOTH_REFINER', 'DISTILLATION']}
                                isExpanded={expandedCategory === 'refining'}
                                onToggle={() => setExpandedCategory(expandedCategory === 'refining' ? null : 'refining')}
                            />
                            <SkillCategory
                                title="Crafting"
                                icon={<Hammer />}
                                color="#f472b6"
                                skillsList={['WARRIOR_CRAFTER', 'MAGE_CRAFTER', 'TOOL_CRAFTER', 'COOKING', 'ALCHEMY']}
                                isExpanded={expandedCategory === 'crafting'}
                                onToggle={() => setExpandedCategory(expandedCategory === 'crafting' ? null : 'crafting')}
                            />
                            <SkillCategory
                                title="Adventure"
                                icon={<Sword />}
                                color="#ef4444"
                                skillsList={['COMBAT', 'DUNGEONEERING']}
                                isExpanded={expandedCategory === 'adventure'}
                                onToggle={() => setExpandedCategory(expandedCategory === 'adventure' ? null : 'adventure')}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Crosshair size={14} style={{ color: '#ef4444' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>DMG <span style={{ color: '#fff' }}>{stats.damage || 0}</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={14} style={{ color: '#60a5fa' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>DEF <span style={{ color: '#fff' }}>{stats.defense || 0}</span></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={14} style={{ color: '#facc15' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>SPD <span style={{ color: '#fff' }}>{stats.attackSpeed ? `${(stats.attackSpeed / 1000).toFixed(1)}s` : '1.0s'}</span></span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
});

export default InspectModal;
