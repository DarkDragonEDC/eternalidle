import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, LogOut, Coins, Info, Shield, 
    Edit2, Check, AlertTriangle, HelpCircle, 
    ChevronRight, Package, Globe, Settings 
} from 'lucide-react';
import { GUILD_XP_TABLE, calculateMaterialNeeds } from '@shared/guilds';
import { formatItemId } from '@shared/items';
import { COUNTRIES } from '@shared/countries';
import { GuildRoles } from './GuildRoles';
import { GuildRoleEditor } from './GuildRoleEditor';

// Reusable Modal Wrapper
const Modal = ({ isOpen, onClose, children, title, maxWidth = '450px', border = '1px solid rgba(255,255,255,0.08)', hideHeader = false }) => {
    if (!isOpen) return null;
    return ReactDOM.createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, backdropFilter: 'blur(8px)',
                    padding: '20px'
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: '#000', borderRadius: '24px', border,
                        maxWidth, width: '100%',
                        position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                        maxHeight: '90vh', display: 'flex', flexDirection: 'column', 
                        overflow: 'hidden'
                    }}
                >
                    {!hideHeader && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 16px 24px', flexShrink: 0 }}>
                            <h3 style={{ color: 'var(--accent)', margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>{title}</h3>
                            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '8px', borderRadius: '50%', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                    )}
                    <div style={{ 
                        overflowY: 'auto', 
                        flex: 1, 
                        padding: hideHeader ? '0' : '0 24px 24px 24px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--accent) rgba(0,0,0,0)'
                    }}>
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

export const GuildModals = ({
    // States
    showDonateModal, setShowDonateModal,
    kickConfirm, setKickConfirm,
    showLeaveConfirm, setShowLeaveConfirm,
    showDisbandConfirm, setShowDisbandConfirm,
    showEditCustomization, setShowEditCustomization,
    showRolesModal, setShowRolesModal,
    // Actions
    onDonate,
    onKick,
    onLeave,
    onDisband,
    onUpdateCustomization,
    onCreateRole,
    onUpdateRole,
    onDeleteRole,
    onReorderRoles,
    // Context
    guild,
    gameState,
    donationSilver, setDonationSilver,
    selectedDonationItem, setSelectedDonationItem,
    donationItemAmount, setDonationItemAmount,
    donationPending,
    isUpdating,
    ICONS,
    playerHasPermission
}) => {
    const materialNeeds = useMemo(() => guild ? calculateMaterialNeeds(guild) : {}, [guild]);
    
    // Customization States
    const [editName, setEditName] = useState(guild?.name || "");
    const [editTag, setEditTag] = useState(guild?.tag || "");
    const [editSummary, setEditSummary] = useState(guild?.summary || "");
    const [editIcon, setEditIcon] = useState(guild?.icon || 'Shield');
    const [editBgColor, setEditBgColor] = useState(guild?.bg_color || '#1a1a1a');
    const [editIconColor, setEditIconColor] = useState(guild?.icon_color || '#ffffff');
    const [editCountry, setEditCountry] = useState(guild?.country_code ? COUNTRIES.find(c => c.code === guild.country_code) : null);
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    // Roles States
    const [editingRole, setEditingRole] = useState(null);
    const [isCreatingRole, setIsCreatingRole] = useState(false);

    const getItemAmount = (itemId) => {
        if (!itemId) return 0;
        const baseId = itemId.split('::')[0];
        let total = 0;
        const inventory = gameState?.state?.inventory || {};
        Object.entries(inventory).forEach(([invId, data]) => {
            if (invId.split('::')[0] === baseId) {
                total += typeof data === 'object' ? data.amount : (data || 0);
            }
        });
        return total;
    };

    const sortedMaterials = useMemo(() => {
        const rawMaterials = ['WOOD', 'ORE', 'HIDE', 'FIBER', 'FISH', 'HERB'];
        const list = [];
        for (let t = 1; t <= 10; t++) {
            rawMaterials.forEach(mat => {
                const id = `T${t}_${mat}`;
                if (materialNeeds[id] > 0 || getItemAmount(id) > 0) {
                    list.push({ id, needed: materialNeeds[id] || 0 });
                }
            });
        }
        return list;
    }, [materialNeeds, gameState?.state?.inventory]);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const handleSaveRole = (data) => {
        if (isCreatingRole) {
            onCreateRole(data.name, data.color);
        } else {
            onUpdateRole(editingRole.id, data);
        }
        setEditingRole(null);
        setIsCreatingRole(false);
    };

    const guildRolesList = useMemo(() => {
        if (!guild?.roles) return [];
        return Object.entries(guild.roles).map(([id, data]) => ({ id, ...data }));
    }, [guild?.roles]);

    const nameCost = (editName && editName.trim() !== guild?.name) ? 250 : 0;
    const tagCost = (editTag && editTag.toUpperCase().slice(0, 4) !== guild?.tag) ? 100 : 0;
    const totalCost = nameCost + tagCost;
    const playerOrbs = gameState?.state?.orbs || 0;
    const hasEnoughOrbs = playerOrbs >= totalCost;

    return (
        <>
            {/* Customization Modal */}
            <Modal isOpen={showEditCustomization} onClose={() => setShowEditCustomization(false)} maxWidth="430px" hideHeader={true}>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)', borderRadius: '10px' }}>
                                <Settings size={18} color="var(--accent)" />
                            </div>
                            <div>
                                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.5px' }}>EDIT GUILD</h3>
                                <p style={{ color: 'rgba(255, 255, 255, 0.4)', margin: 0, fontSize: '0.65rem' }}>Global Guild Settings</p>
                            </div>
                        </div>
                        <button onClick={() => setShowEditCustomization(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.3)', cursor: 'pointer' }}>
                            <X size={22} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Identity Inputs */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase' }}>GUILD NAME</label>
                                    {nameCost > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                                            <Coins size={10} color="#ff4444" />
                                            <span style={{ fontSize: '0.6rem', color: '#ff4444', fontWeight: '900' }}>{nameCost}</span>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="text" 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)} 
                                    placeholder="Enter guild name..." 
                                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none' }} 
                                />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', textTransform: 'uppercase' }}>GUILD TAG</label>
                                    {tagCost > 0 && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                            <Coins size={10} color="#ff4444" />
                                            <span style={{ fontSize: '0.6rem', color: '#ff4444', fontWeight: '900' }}>{tagCost}</span>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="text" 
                                    value={editTag} 
                                    onChange={(e) => setEditTag(e.target.value.toUpperCase())} 
                                    maxLength={4} 
                                    placeholder="TAG" 
                                    style={{ width: '85px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '0.85rem', textAlign: 'center', fontWeight: 'bold', outline: 'none' }} 
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>GUILD SUMMARY</label>
                            <textarea 
                                value={editSummary} 
                                onChange={(e) => setEditSummary(e.target.value)} 
                                placeholder="Write a short description..." 
                                rows="2" 
                                style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '0.8rem', resize: 'none', outline: 'none', minHeight: '50px' }} 
                            />
                        </div>

                        {/* Emblem Picker */}
                        <div>
                            <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>GUILD EMBLEM & COLORS</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '20px', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Preview Shield */}
                                    <div style={{ width: '60px', height: '60px', background: editBgColor, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 15px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                        {React.createElement(ICONS[editIcon] || Shield, { size: 30, color: editIconColor })}
                                    </div>

                                    {/* Color Selectors */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                        <div>
                                            <label style={{ fontSize: '0.5rem', color: 'rgba(255, 255, 255, 0.3)', marginBottom: '4px', display: 'block', fontWeight: '900' }}>ICON COLOR</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {['#ffffff', '#ffd700', '#ff4444', '#34d399', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'].map(color => (
                                                    <div 
                                                        key={color} 
                                                        onClick={() => setEditIconColor(color)} 
                                                        style={{ width: '16px', height: '16px', borderRadius: '50%', background: color, cursor: 'pointer', border: editIconColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)', transform: editIconColor === color ? 'scale(1.1)' : 'scale(1)' }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.5rem', color: 'rgba(255, 255, 255, 0.3)', marginBottom: '4px', display: 'block', fontWeight: '900' }}>BG COLOR</label>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {['#1a1a1a', '#2d1a1a', '#1a2d1a', '#1a1a2d', '#2d2d1a', '#2d1a2d', '#1a2d2d', '#333333'].map(color => (
                                                    <div 
                                                        key={color} 
                                                        onClick={() => setEditBgColor(color)} 
                                                        style={{ width: '16px', height: '16px', borderRadius: '50%', background: color, cursor: 'pointer', border: editBgColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)', transform: editBgColor === color ? 'scale(1.1)' : 'scale(1)' }} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Icon Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '5px', width: '100%' }}>
                                    {Object.keys(ICONS).map(icon => (
                                        <button 
                                            key={icon} 
                                            onClick={() => setEditIcon(icon)} 
                                            style={{ 
                                                aspectRatio: '1',
                                                padding: '0',
                                                background: editIcon === icon ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255, 255, 255, 0.03)', 
                                                border: editIcon === icon ? '1px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.08)', 
                                                borderRadius: '8px', cursor: 'pointer', 
                                                color: editIcon === icon ? 'var(--accent)' : 'rgba(255, 255, 255, 0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            {React.createElement(ICONS[icon], { size: 14 })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Region Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '900', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>GUILD REGION</label>
                                <button 
                                    onClick={() => setShowCountryPicker(true)}
                                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                                >
                                    {editCountry ? (
                                        <>
                                            <img src={`https://flagcdn.com/w40/${editCountry.code.toLowerCase()}.png`} style={{ height: '1rem', width: 'auto', borderRadius: '2px' }} alt={editCountry.name} />
                                            <span style={{ color: '#fff', fontSize: '0.8rem' }}>{editCountry.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe size={14} color="rgba(255,255,255,0.4)" />
                                            <span style={{ color: '#fff', fontSize: '0.8rem' }}>Global / No Region</span>
                                        </>
                                    )}
                                    <div style={{ marginLeft: 'auto', opacity: 0.3 }}>
                                        <ChevronRight size={12} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onUpdateCustomization({
                            name: editName,
                            tag: editTag,
                            summary: editSummary,
                            icon: editIcon,
                            iconColor: editIconColor,
                            bgColor: editBgColor,
                            countryCode: editCountry?.code || null
                        })}
                        disabled={isUpdating || (totalCost > 0 && !hasEnoughOrbs)}
                        style={{ 
                            width: '100%', padding: '12px', background: totalCost > 0 && !hasEnoughOrbs ? 'rgba(255,68,68,0.2)' : 'var(--accent)', 
                            border: totalCost > 0 && !hasEnoughOrbs ? '1px solid rgba(255,68,68,0.4)' : 'none', 
                            borderRadius: '12px', 
                            color: totalCost > 0 && !hasEnoughOrbs ? '#ff4444' : '#000', fontWeight: '900', cursor: isUpdating || (totalCost > 0 && !hasEnoughOrbs) ? 'not-allowed' : 'pointer', marginTop: '5px', 
                            boxShadow: totalCost > 0 && !hasEnoughOrbs ? 'none' : '0 5px 15px rgba(212, 175, 55, 0.15)', letterSpacing: '0.5px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                            opacity: isUpdating ? 0.6 : 1, fontSize: '0.85rem'
                        }}
                    >
                        {totalCost > 0 ? (
                            <>
                                <span>{isUpdating ? 'SAVING...' : !hasEnoughOrbs ? 'INSUFFICIENT ORBS' : 'SAVE CHANGES'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}>
                                    <Coins size={12} />
                                    <span style={{ fontSize: '0.75rem' }}>-{totalCost} Orbs</span>
                                </div>
                            </>
                        ) : (
                            <span>{isUpdating ? 'SAVING...' : 'SAVE CHANGES'}</span>
                        )}
                    </button>
                </div>

                {/* Regional Country Picker (Nested Modal Logic) */}
                <AnimatePresence>
                    {showCountryPicker && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '90%', maxWidth: '350px', background: '#000', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <div style={{ fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>SELECT REGION</div>
                                    <X size={20} onClick={() => setShowCountryPicker(false)} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }} />
                                </div>
                                <input type="text" placeholder="Search region..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', marginBottom: '15px' }} />
                                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', paddingRight: '5px' }}>
                                    <button onClick={() => { setEditCountry(null); setShowCountryPicker(false); }} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>🌐</button>
                                    {filteredCountries.map(c => (
                                        <button key={c.code} onClick={() => { setEditCountry(c); setShowCountryPicker(false); }} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} style={{ width: '24px', borderRadius: '2px' }} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Modal>

            {/* Donation Modal */}
            <Modal isOpen={showDonateModal} onClose={() => setShowDonateModal(false)} title="GUILD DONATION" maxWidth="450px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Silver Donation */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Donate Silver</div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                <input
                                    type="number"
                                    value={donationSilver}
                                    onChange={(e) => setDonationSilver(e.target.value)}
                                    placeholder="0"
                                    style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                />
                                <Coins size={18} color="#ffd700" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                            <button 
                                onClick={() => setDonationSilver(gameState?.state?.silver?.toString())} 
                                style={{ padding: '0 15px', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px', color: 'var(--accent)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', flexShrink: 0 }}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {/* Item Donation Grid */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Donate Raw Items</div>
                        
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(5, 1fr)', 
                            gap: '8px', 
                            maxHeight: '150px', 
                            overflowY: 'auto', 
                            paddingRight: '4px',
                            marginBottom: '10px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'var(--accent) rgba(0,0,0,0)'
                        }}>
                            {sortedMaterials
                                .filter(m => {
                                    const needed = materialNeeds[m.id] || 0;
                                    const inBank = guild?.bank_items?.[m.id]?.amount || guild?.bank_items?.[m.id] || 0;
                                    const remainingNeed = Math.max(0, needed - inBank);
                                    return remainingNeed > 0 && getItemAmount(m.id) > 0;
                                })
                                .map(m => {
                                    const has = getItemAmount(m.id);
                                    const needed = materialNeeds[m.id] || 0;
                                    const inBank = guild?.bank_items?.[m.id]?.amount || guild?.bank_items?.[m.id] || 0;
                                    const remainingNeed = Math.max(0, needed - inBank);
                                    const isSelected = selectedDonationItem === m.id;
                                    const tier = parseInt(m.id.match(/T(\d+)/)?.[1] || '1');
                                    
                                    // Tier colors to match game style
                                    const tierColors = {
                                        1: 'rgb(160, 174, 192)', // Common
                                        2: 'rgb(72, 187, 120)',  // Uncommon
                                        3: 'rgb(66, 153, 225)',  // Rare
                                        4: 'rgb(159, 122, 234)', // Epic
                                        5: 'rgb(237, 137, 54)',  // Legendary
                                        6: 'rgb(245, 101, 101)', // Mythic
                                        7: 'rgb(112, 214, 255)', // Relic
                                        8: 'rgb(255, 112, 166)', // Celestial
                                        9: 'rgb(255, 184, 76)',  // Eternal
                                        10: 'rgb(255, 255, 255)' // Divine
                                    };

                                    const formatAmount = (num) => {
                                        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                                        return num.toString();
                                    };

                                    return (
                                        <div 
                                            key={m.id} 
                                            onClick={() => {
                                                setSelectedDonationItem(m.id);
                                                setDonationItemAmount(Math.min(has, remainingNeed).toString());
                                            }}
                                            style={{ cursor: 'pointer', position: 'relative' }}
                                        >
                                            <div style={{ 
                                                width: '100%', 
                                                aspectRatio: '1',
                                                background: 'rgba(0, 0, 0, 0.5)', 
                                                borderRadius: '8px', 
                                                border: `1px solid ${isSelected ? 'var(--accent)' : tierColors[tier] || 'rgba(255,255,255,0.1)'}`, 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                position: 'relative',
                                                transition: '0.1s',
                                                overflow: 'hidden',
                                                boxShadow: isSelected ? '0 0 10px var(--accent)' : 'none'
                                            }}>
                                                <img src={`/items/${m.id}.webp`} style={{ width: '32px', height: '32px' }} alt={m.id} />
                                                <div style={{ 
                                                    position: 'absolute', bottom: '-1px', right: '-1px', 
                                                    background: 'rgba(0, 0, 0, 0.8)', padding: '1px 4px', 
                                                    borderRadius: '4px 0 0 0', fontSize: '0.6rem', fontWeight: 'bold', color: '#fff',
                                                    borderTop: '1px solid rgba(255,255,255,0.2)', borderLeft: '1px solid rgba(255,255,255,0.2)'
                                                }}>
                                                    {formatAmount(has)}
                                                </div>
                                            </div>
                                            <div style={{ 
                                                fontSize: '0.55rem', 
                                                color: isSelected ? 'var(--accent)' : 'var(--text-dim)', 
                                                marginTop: '4px', 
                                                textCenter: 'center', 
                                                width: '100%',
                                                textAlign: 'center',
                                                whiteSpace: 'nowrap', 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis' 
                                            }}>
                                                {formatItemId(m.id, true).toUpperCase()}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Selected Item Input */}
                        {selectedDonationItem && (
                            <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                marginTop: '10px',
                                animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                                    <input
                                        type="number"
                                        value={donationItemAmount}
                                        onChange={(e) => setDonationItemAmount(e.target.value)}
                                        placeholder="0"
                                        style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                    />
                                    <img 
                                        src={`/items/${selectedDonationItem}.webp`} 
                                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px' }} 
                                        alt="item"
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        const has = getItemAmount(selectedDonationItem);
                                        const needed = materialNeeds[selectedDonationItem] || 0;
                                        const inBank = guild?.bank_items?.[selectedDonationItem]?.amount || guild?.bank_items?.[selectedDonationItem] || 0;
                                        const remainingNeed = Math.max(0, needed - inBank);
                                        setDonationItemAmount(Math.min(has, remainingNeed).toString());
                                    }} 
                                    style={{ padding: '0 15px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', flexShrink: 0 }}
                                >
                                    MAX
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            const donationData = {
                                silver: donationSilver ? Number(donationSilver) : 0,
                                items: {}
                            };
                            if (selectedDonationItem && donationItemAmount && Number(donationItemAmount) > 0) {
                                const totalCap = materialNeeds[selectedDonationItem] || 0;
                                const inBank = guild?.bank_items?.[selectedDonationItem]?.amount || guild?.bank_items?.[selectedDonationItem] || 0;
                                const remainingNeed = Math.max(0, totalCap - inBank);
                                // Ensure we don't send more than needed
                                const safeAmount = Math.min(Number(donationItemAmount), remainingNeed);
                                if (safeAmount > 0) {
                                    donationData.items[selectedDonationItem] = safeAmount;
                                }
                            }
                            if (donationData.silver > 0 || Object.keys(donationData.items).length > 0) {
                                onDonate(donationData);
                            }
                        }}
                        disabled={donationPending || (!donationSilver && (!selectedDonationItem || !donationItemAmount))}
                        style={{ 
                            width: '100%', padding: '16px', background: 'var(--accent)', border: 'none', 
                            borderRadius: '16px', color: '#000', fontWeight: '900', fontSize: '0.9rem', 
                            cursor: (donationPending || (!donationSilver && (!selectedDonationItem || !donationItemAmount))) ? 'default' : 'pointer',
                            opacity: (donationPending || (!donationSilver && (!selectedDonationItem || !donationItemAmount))) ? 0.4 : 1,
                            marginTop: '10px'
                        }}
                    >
                        {donationPending ? 'PROCESSING...' : 'CONFIRM DONATION'}
                    </button>
                </div>
            </Modal>

            {/* Kick Modal */}
            <Modal isOpen={!!kickConfirm} onClose={() => setKickConfirm(null)} title="KICK MEMBER" maxWidth="320px" border="1px solid rgba(255, 68, 68, 0.2)">
                <div style={{ textAlign: 'center' }}>
                    <LogOut size={32} color="#ff4444" style={{ marginBottom: '12px' }} />
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Kick "{kickConfirm?.name}"?</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setKickConfirm(null)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => onKick(kickConfirm.id)} style={{ flex: 1, padding: '10px', background: 'rgba(255, 68, 68, 0.2)', borderRadius: '10px', color: '#ff4444', fontWeight: '900', cursor: 'pointer' }}>Kick</button>
                    </div>
                </div>
            </Modal>

            {/* Leave Modal */}
            <Modal isOpen={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)} title="LEAVE GUILD" maxWidth="320px">
                <div style={{ textAlign: 'center' }}>
                    <LogOut size={32} color="#ff4444" style={{ marginBottom: '12px' }} />
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>Are you sure you want to leave?</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={onLeave} style={{ flex: 1, padding: '10px', background: 'rgba(255, 68, 68, 0.2)', borderRadius: '10px', color: '#ff4444', fontWeight: '900', cursor: 'pointer' }}>Leave</button>
                    </div>
                </div>
            </Modal>

            {/* Disband Modal */}
            <Modal isOpen={showDisbandConfirm} onClose={() => setShowDisbandConfirm(false)} title="DISBAND GUILD" maxWidth="320px" border="1px solid rgba(255, 68, 68, 0.3)">
                <div style={{ textAlign: 'center' }}>
                    <AlertTriangle size={32} color="#ff4444" style={{ marginBottom: '12px' }} />
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}>WARNING!</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '5px' }}>This will permanently delete the guild and remove all members. This cannot be undone.</div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button onClick={() => setShowDisbandConfirm(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={onDisband} style={{ flex: 1, padding: '10px', background: 'rgba(255, 68, 68, 0.4)', borderRadius: '10px', color: '#ff4444', fontWeight: '900', cursor: 'pointer' }}>Disband</button>
                    </div>
                </div>
            </Modal>

            {/* Roles Modal */}
            <Modal 
                isOpen={showRolesModal} 
                onClose={() => { setShowRolesModal(false); setEditingRole(null); setIsCreatingRole(false); }} 
                title={editingRole || isCreatingRole ? "EDIT ROLE" : "GUILD ROLES"} 
                maxWidth="500px"
            >
                {editingRole || isCreatingRole ? (
                    <GuildRoleEditor 
                        role={editingRole} 
                        isNew={isCreatingRole}
                        onSave={handleSaveRole}
                        onCancel={() => { setEditingRole(null); setIsCreatingRole(false); }}
                    />
                ) : (
                    <GuildRoles 
                        roles={guildRolesList}
                        onEditRole={setEditingRole}
                        onCreateRole={() => setIsCreatingRole(true)}
                        onDeleteRole={onDeleteRole}
                        onReorderRoles={onReorderRoles}
                        playerHasPermission={playerHasPermission}
                        isMobile={false}
                    />
                )}
            </Modal>
        </>
    );
};

export const TaskContributeModal = ({ 
    isOpen, 
    onClose, 
    task, 
    onContribute, 
    getItemAmount 
}) => {
    const [amount, setAmount] = React.useState('');
    const itemId = task?.itemId || task?.item_id;
    const has = getItemAmount?.(itemId) || 0;
    const needed = (task?.required || 0) - (task?.progress || 0);

    const handleConfirm = () => {
        const val = parseInt(amount);
        if (isNaN(val) || val <= 0) return;
        onContribute(task.id, val);
        onClose();
        setAmount('');
    };

    if (!isOpen || !task) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="CONTRIBUTE MATERIALS" maxWidth="450px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>{formatItemId(itemId)}</div>
                
                {/* Inventory Card */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <div style={{ 
                        width: '48px', height: '48px', background: '#000', borderRadius: '12px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <img src={`/items/${itemId}.webp`} style={{ width: '30px', height: '30px' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>YOUR INVENTORY</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#44aaff' }}>{has.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>Items</span></div>
                    </div>
                </div>

                {/* Input Section */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>AMOUNT TO DONATE</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)' }}>Remaining: {needed.toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <input 
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Enter amount..."
                                style={{ 
                                    width: '100%', padding: '15px', background: '#000', border: '1px solid rgba(255,255,255,0.1)', 
                                    borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: 'bold', outline: 'none'
                                }}
                            />
                        </div>
                        <button 
                            onClick={() => setAmount(Math.min(has, parseInt(needed) || 0).toString())}
                            style={{ 
                                padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '12px', color: '#44aaff', fontWeight: '900', cursor: 'pointer', flexShrink: 0
                            }}
                        >
                            MAX
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleConfirm}
                    disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > has}
                    style={{ 
                        width: '100%', padding: '18px', background: 'rgba(68, 119, 153, 0.8)', 
                        borderRadius: '16px', color: '#000', fontWeight: '900', fontSize: '0.9rem',
                        cursor: 'pointer', transition: '0.2s', border: 'none',
                        opacity: (!amount || parseInt(amount) <= 0 || parseInt(amount) > has) ? 0.3 : 1
                    }}
                >
                    CONFIRM CONTRIBUTION
                </button>
            </div>
        </Modal>
    );
};
