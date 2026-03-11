import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Flame, Cpu, Heart, Leaf, Zap, Snowflake, Droplets, ChevronDown, Check, Eye, Castle } from 'lucide-react';

const THEMES = [
    { id: 'medieval', label: 'Medieval', icon: <Castle size={16} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { id: 'ember', label: 'Ember', icon: <Flame size={16} /> },
    { id: 'cyber', label: 'Cyber', icon: <Cpu size={16} /> },
    { id: 'rose', label: 'Rose', icon: <Heart size={16} /> },
    { id: 'nature', label: 'Nature', icon: <Leaf size={16} /> },
    { id: 'arcane', label: 'Arcane', icon: <Zap size={16} /> },
    { id: 'ice', label: 'Ice', icon: <Snowflake size={16} /> },
    { id: 'crimson', label: 'Crimson', icon: <Droplets size={16} /> }
];

const ThemeSelector = ({ theme, setTheme, isMobile, gameState, onUnlockTheme, onPreviewTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentTheme = THEMES.find(t => t.id === theme) || THEMES[0];
    const unlockedThemes = gameState?.state?.unlockedThemes || ['medieval', 'dark'];

    const handleThemeClick = (t) => {
        if (unlockedThemes.includes(t.id)) {
            setTheme(t.id);
            setIsOpen(false);
        } else {
            if (onUnlockTheme) {
                onUnlockTheme(t.id);
                setIsOpen(false);
            }
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: isMobile ? 'none' : '200px' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    background: 'var(--accent-soft)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 15px var(--accent-soft)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {currentTheme.icon}
                    <span>Mode</span>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex' }}
                >
                    <ChevronDown size={16} />
                </motion.div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            left: 0,
                            right: 0,
                            background: 'var(--panel-bg)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid var(--border-active)',
                            borderRadius: '12px',
                            padding: '6px',
                            zIndex: 1000,
                            boxShadow: 'var(--panel-shadow)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}
                    >
                        {THEMES.map((t) => {
                            const isUnlocked = unlockedThemes.includes(t.id);
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => handleThemeClick(t)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleThemeClick(t);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: theme === t.id ? 'var(--accent-soft)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: theme === t.id ? 'var(--accent)' : 'var(--text-dim)',
                                        fontSize: '0.75rem',
                                        fontWeight: theme === t.id ? 'bold' : '500',
                                        cursor: 'pointer',
                                        transition: '0.2s',
                                        opacity: isUnlocked ? 1 : 0.6
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {t.icon}
                                        <span>{t.label}</span>
                                    </div>
                                    {isUnlocked ? (
                                        theme === t.id && <Check size={14} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#ffeb3b', opacity: 0.8 }}>
                                                <span>50</span>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffeb3b', boxShadow: '0 0 5px #ffeb3b' }} />
                                            </div>
                                            {onPreviewTheme && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPreviewTheme(t.id);
                                                        setIsOpen(false);
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.stopPropagation();
                                                            onPreviewTheme(t.id);
                                                            setIsOpen(false);
                                                        }
                                                    }}
                                                    title="Preview Theme"
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '4px',
                                                        padding: '4px',
                                                        color: 'var(--text-dim)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: '0.2s'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                                        e.currentTarget.style.color = 'var(--accent)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                        e.currentTarget.style.color = 'var(--text-dim)';
                                                    }}
                                                >
                                                    <Eye size={12} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ThemeSelector;
