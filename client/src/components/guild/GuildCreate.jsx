import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Shield, X, Coins, Sparkles, Globe } from 'lucide-react';
import { COUNTRIES } from '@shared/countries';

const ICON_COLORS = ['#ffffff', '#ff4444', '#44aaff', '#44ff44', '#ffd700', '#ff8800', '#9c27b0', '#e91e63'];
const BG_COLORS = ['#d4af37', '#1a1a1a', '#8b0000', '#4169e1', '#228b22', '#800080'];

const CountryFlag = ({ code, name, size = '1.2rem', style = {} }) => {
    if (!code) return <span style={{ fontSize: size, ...style }}>🌐</span>;
    return (
        <img
            src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
            alt={name || code}
            title={name || code}
            style={{
                height: isNaN(size) ? size : `${size}px`,
                width: 'auto',
                borderRadius: '2px',
                display: 'inline-block',
                verticalAlign: 'middle',
                ...style
            }}
        />
    );
};

export const GuildCreate = ({ 
    onCreate, 
    isSubmitting, 
    userSilver, 
    userOrbs, 
    isMobile,
    ICONS 
}) => {
    const [guildName, setGuildName] = useState('');
    const [guildTag, setGuildTag] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Shield');
    const [iconColor, setIconColor] = useState('#ffffff');
    const [bgColor, setBgColor] = useState('#d4af37'); // Default gold
    const [guildSummary, setGuildSummary] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('silver');
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);

    const SILVER_COST = 500000;
    const ORB_COST = 100;
    const canAfford = paymentMethod === 'silver' ? userSilver >= SILVER_COST : userOrbs >= ORB_COST;

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const handleCreateGuild = () => {
        onCreate({
            name: guildName,
            tag: guildTag,
            icon: selectedIcon,
            iconColor: iconColor,
            bgColor: bgColor,
            summary: guildSummary,
            paymentMethod: paymentMethod,
            countryCode: selectedCountry?.code || null
        });
    };

    const PreviewIcon = ICONS[selectedIcon] || Shield;

    return (
        <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
                background: '#0a0a0a',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: isMobile ? '2px 8px 6px' : '2px 16px 14px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
        >
            {/* Compact PREVIEW - AAA Polish */}
            <div style={{ marginBottom: isMobile ? '12px' : '18px', position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.6rem',
                    color: 'var(--accent)',
                    letterSpacing: '2px',
                    fontWeight: '900',
                    background: '#0a0a0a',
                    padding: '0 10px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: 1
                }}>HOW OTHERS WILL SEE YOUR GUILD</div>
                <motion.div
                    key={guildName + guildTag + selectedIcon + iconColor + bgColor + (selectedCountry?.code || '') + guildSummary}
                    initial={{ opacity: 0.9, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        padding: '12px 15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: bgColor,
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <PreviewIcon size={20} color={iconColor} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{guildName || 'New Guild'}</div>
                                {selectedCountry && (
                                    <CountryFlag code={selectedCountry.code} name={selectedCountry.name} size="1rem" />
                                )}
                                <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontWeight: 'bold' }}>[{guildTag || 'TAG'}]</span>
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                LVL 1 • MIN LVL 1 {guildSummary ? `\u2022 ${guildSummary}` : '\u2022 Stronger Together'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div
                            style={{
                                padding: '6px 16px',
                                background: 'var(--accent)',
                                borderRadius: '8px',
                                color: '#000',
                                fontSize: '0.7rem',
                                fontWeight: '900',
                                opacity: 0.4
                            }}
                        >
                            JOIN
                        </div>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>1/10</span>
                    </div>
                </motion.div>
            </div>

            {/* Main Interaction Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

                {/* LEFT COLUMN: Identity info */}
                <div style={{
                    background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                    padding: isMobile ? '8px' : '10px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={12} color="var(--accent)" /> IDENTITY
                    </div>
                    {/* Guild Name */}
                    <div>
                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD NAME - {guildName.length}/15</label>
                        <input
                            type="text"
                            placeholder="Ex: Knights of Chaos"
                            maxLength={15}
                            value={guildName}
                            onChange={(e) => setGuildName(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.8rem',
                                outline: 'none',
                                transition: '0.2s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--accent)';
                                e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    {/* Guild Tag & Country */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD TAG - {guildTag.length}/4</label>
                            <input
                                type="text"
                                placeholder="TAG"
                                maxLength={4}
                                value={guildTag}
                                onChange={(e) => setGuildTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#1a1a1a',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'var(--accent)',
                                    fontSize: '0.85rem',
                                    fontWeight: '900',
                                    letterSpacing: '2px',
                                    outline: 'none',
                                    transition: '0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)';
                                    e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>COUNTRY</label>
                            <button
                                onClick={() => setShowCountryPicker(!showCountryPicker)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#1a1a1a',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    height: '37px'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'var(--accent)';
                                    e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--border)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            >
                                <CountryFlag code={selectedCountry?.code} name={selectedCountry?.name} size="1.2rem" />
                                <span style={{ color: selectedCountry ? '#fff' : 'var(--text-dim)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {selectedCountry ? selectedCountry.name : 'All Regions'}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showCountryPicker && (
                                    <>
                                        {/* Backdrop */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setShowCountryPicker(false)}
                                            style={{
                                                position: 'fixed',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: 'rgba(0,0,0,0.8)',
                                                backdropFilter: 'blur(5px)',
                                                zIndex: 10000
                                            }}
                                        />
                                        {/* Modal */}
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                                            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }}
                                            style={{
                                                position: 'fixed',
                                                top: '50%',
                                                left: '50%',
                                                width: 'min(350px, 90vw)',
                                                background: '#111',
                                                border: '2px solid var(--accent)',
                                                borderRadius: '24px',
                                                padding: '24px',
                                                zIndex: 10001,
                                                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '15px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>CHOOSE ORIGIN</div>
                                                <button onClick={() => setShowCountryPicker(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><X size={20} /></button>
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Filter country..."
                                                value={countrySearch}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: '#0a0a0a',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '12px',
                                                    color: '#fff',
                                                    fontSize: '0.9rem',
                                                    outline: 'none',
                                                    borderColor: 'rgba(255,255,255,0.1)'
                                                }}
                                                autoFocus
                                            />
                                            <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '5px' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCountry(null);
                                                        setShowCountryPicker(false);
                                                    }}
                                                    style={{
                                                        aspectRatio: '1',
                                                        background: !selectedCountry ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                                        border: `1px solid ${!selectedCountry ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                        borderRadius: '12px',
                                                        fontSize: '1.5rem',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: '0.2s'
                                                    }}
                                                >
                                                    🌐
                                                </button>
                                                {filteredCountries.map(c => (
                                                    <button
                                                        key={c.code}
                                                        onClick={() => {
                                                            setSelectedCountry(c);
                                                            setShowCountryPicker(false);
                                                        }}
                                                        style={{
                                                            aspectRatio: '1',
                                                            background: selectedCountry?.code === c.code ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                                            border: `1px solid ${selectedCountry?.code === c.code ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                                            borderRadius: '12px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: '0.2s'
                                                        }}
                                                        title={c.name}
                                                    >
                                                        <CountryFlag code={c.code} name={c.name} size="1.8rem" />
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Guild Summary */}
                    <div>
                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginLeft: '4px', display: 'block', marginBottom: '2px', fontWeight: 'bold' }}>GUILD SUMMARY - {guildSummary.length}/100</label>
                        <textarea
                            placeholder="Describe your guild's purpose..."
                            maxLength={100}
                            value={guildSummary}
                            onChange={(e) => setGuildSummary(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: '#1a1a1a',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '0.75rem',
                                outline: 'none',
                                transition: '0.2s',
                                resize: 'none',
                                height: isMobile ? '35px' : '40px',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--accent)';
                                e.target.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: Appearance */}
                <div style={{
                    background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
                    padding: isMobile ? '8px' : '10px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-dim)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={10} color="var(--accent)" /> APPEARANCE
                    </div>

                    <div>
                        <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>CHOOSE ICON</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                            {Object.keys(ICONS).map(iconName => {
                                const IconComp = ICONS[iconName];
                                return (
                                    <motion.button
                                        key={iconName}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setSelectedIcon(iconName)}
                                        style={{
                                            aspectRatio: '1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: selectedIcon === iconName
                                                ? 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)'
                                                : '#1a1a1a',
                                            border: `1px solid ${selectedIcon === iconName ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            color: selectedIcon === iconName ? '#000' : 'rgba(255,255,255,0.4)',
                                            transition: '0.2s',
                                            padding: '0'
                                        }}
                                    >
                                        <IconComp size={isMobile ? 12 : 14} />
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? '6px' : '12px' }}>
                        {/* Icon Color Selection */}
                        <div>
                            <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>ICON COLOR</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                {ICON_COLORS.map((color, idx) => (
                                    <motion.button
                                        key={`${color}-${idx}`}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.8 }}
                                        onClick={() => setIconColor(color)}
                                        style={{
                                            width: isMobile ? '16px' : '20px',
                                            height: isMobile ? '16px' : '20px',
                                            background: color,
                                            border: iconColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            boxShadow: iconColor === color ? `0 0 10px ${color}88` : 'none',
                                            transition: 'all 0.2s',
                                            padding: 0
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Background Color Selection */}
                        <div>
                            <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>BG COLOR</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                {BG_COLORS.map((color, idx) => (
                                    <motion.button
                                        key={`${color}-${idx}`}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.8 }}
                                        onClick={() => setBgColor(color)}
                                        style={{
                                            width: isMobile ? '16px' : '20px',
                                            height: isMobile ? '16px' : '20px',
                                            background: color,
                                            border: bgColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            boxShadow: bgColor === color ? `0 0 10px ${color}88` : 'none',
                                            transition: 'all 0.2s',
                                            padding: 0
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{
                background: 'linear-gradient(180deg, #0e0e0e 0%, #050505 100%)',
                padding: isMobile ? '8px' : '10px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', textAlign: 'center', fontWeight: '900', letterSpacing: '1px' }}>SELECT PAYMENT METHOD</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 2fr', gap: '7px', marginBottom: '13px' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('silver')}
                        style={{
                            padding: '8px',
                            background: paymentMethod === 'silver'
                                ? 'linear-gradient(180deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)'
                                : '#111',
                            border: `1px solid ${paymentMethod === 'silver' ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: '0.2s',
                            minHeight: '48px',
                            justifyContent: 'center',
                            boxShadow: paymentMethod === 'silver' ? '0 0 15px rgba(212, 175, 55, 0.05)' : 'none'
                        }}
                    >
                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color: paymentMethod === 'silver' ? 'var(--accent)' : 'var(--text-dim)' }}>SILVER</div>
                        <div style={{ fontSize: '0.7rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Coins size={10} color="var(--accent)" /> 500k
                        </div>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setPaymentMethod('orb')}
                        style={{
                            padding: '8px',
                            background: paymentMethod === 'orb'
                                ? 'linear-gradient(180deg, rgba(144, 213, 255, 0.15) 0%, rgba(144, 213, 255, 0.05) 100%)'
                                : '#111',
                            border: `1px solid ${paymentMethod === 'orb' ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: '0.2s',
                            minHeight: '48px',
                            justifyContent: 'center',
                            boxShadow: paymentMethod === 'orb' ? '0 0 15px rgba(144, 213, 255, 0.05)' : 'none'
                        }}
                    >
                        <div style={{ fontSize: '0.6rem', fontWeight: '900', color: paymentMethod === 'orb' ? 'var(--accent)' : 'var(--text-dim)' }}>ORBS</div>
                        <div style={{ fontSize: '0.7rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Sparkles size={10} color="var(--accent)" /> 100
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={canAfford && !isSubmitting ? { scale: 1.01, boxShadow: '0 8px 25px rgba(212, 175, 55, 0.2)' } : {}}
                        whileTap={canAfford && !isSubmitting ? { scale: 0.99 } : {}}
                        onClick={handleCreateGuild}
                        disabled={!canAfford || isSubmitting}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '12px',
                            background: canAfford
                                ? 'linear-gradient(135deg, var(--accent) 0%, #b8860b 100%)'
                                : '#222',
                            color: canAfford ? '#000' : 'rgba(255,255,255,0.1)',
                            border: 'none',
                            cursor: canAfford && !isSubmitting ? 'pointer' : 'not-allowed',
                            fontSize: '0.85rem',
                            fontWeight: '900',
                            transition: '0.3s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            boxShadow: canAfford ? '0 5px 15px rgba(212, 175, 55, 0.1)' : 'none',
                            minHeight: '48px'
                        }}
                    >
                        {isSubmitting ? (
                            <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid #000', borderTop: '2px solid transparent' }} />
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '1px' }}>
                                    <Shield size={16} />
                                    <span>FOUND GUILD</span>
                                </div>
                                <div style={{
                                    fontSize: '0.6rem',
                                    opacity: 0.9,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: canAfford ? '#000' : '#ff4444',
                                    fontWeight: 'bold'
                                }}>
                                    {paymentMethod === 'silver' ? <Coins size={11} color={canAfford ? "#000" : "#ff4444"} /> : <Sparkles size={11} color={canAfford ? "#000" : "#ff4444"} />}
                                    <span>{paymentMethod === 'silver' ? '500,000' : '100'}</span>
                                    {!canAfford && <span>(INSUFFICIENT)</span>}
                                </div>
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
