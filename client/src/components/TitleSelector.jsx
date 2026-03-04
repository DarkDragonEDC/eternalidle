import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const TitleSelector = ({ selectedTitle, unlockedTitles = [], onChange, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 8,
                left: rect.left + rect.width / 2,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                // Also check if click was on the portal content (which is outside containerRef)
                const portalMenu = document.getElementById('title-selector-portal-menu');
                if (portalMenu && portalMenu.contains(e.target)) return;

                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Recalculate position on scroll/resize
    useEffect(() => {
        const updatePos = () => {
            if (isOpen && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + 8,
                    left: rect.left + rect.width / 2,
                    width: rect.width
                });
            }
        };
        window.addEventListener('scroll', updatePos, true);
        window.addEventListener('resize', updatePos);
        return () => {
            window.removeEventListener('scroll', updatePos, true);
            window.removeEventListener('resize', updatePos);
        };
    }, [isOpen]);

    const handleTitleClick = (title) => {
        onChange(title);
        setIsOpen(false);
    };

    const displayTitle = selectedTitle === 'None' ? 'No Title' : selectedTitle;

    return (
        <div ref={containerRef} style={{ position: 'relative', zIndex: 100 }}>
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.02, background: 'rgba(255, 204, 0, 0.05)' }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                style={{
                    fontSize: isMobile ? '0.75rem' : '0.8rem',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    color: '#ffcc00',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 30px 4px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    outline: 'none',
                    position: 'relative',
                    transition: 'all 0.2s',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: 'max-content',
                    justifyContent: 'center'
                }}
            >
                <span style={{ flex: 1 }}>{displayTitle}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{
                        position: 'absolute',
                        right: '4px',
                        display: 'flex'
                    }}
                >
                    <ChevronDown size={14} color="#ffcc00" strokeWidth={3} />
                </motion.div>
            </motion.button>

            {/* Dropdown Menu via Portal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            id="title-selector-portal-menu"
                            initial={{ opacity: 0, y: -10, scale: 0.95, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
                            exit={{ opacity: 0, y: -10, scale: 0.95, x: '-50%' }}
                            transition={{ duration: 0.2, ease: "backOut" }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'fixed',
                                top: isMobile ? '50%' : coords.top,
                                left: isMobile ? '50%' : coords.left,
                                transform: isMobile ? 'translate(-50%, -50%)' : 'translateX(-50%)',
                                width: isMobile ? '85vw' : 'max-content',
                                minWidth: isMobile ? 'none' : '180px',
                                maxWidth: '400px',
                                background: 'rgba(20, 25, 35, 0.98)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 204, 0, 0.3)',
                                borderRadius: '16px',
                                padding: isMobile ? '12px' : '4px',
                                zIndex: 10000,
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(255, 204, 0, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: isMobile ? '8px' : '2px',
                                maxHeight: isMobile ? '70vh' : '250px',
                                overflowY: 'auto',
                                scrollbarWidth: 'thin',
                                scrollbarColor: '#ffcc00 rgba(0,0,0,0.1)'
                            }}
                        >
                            {isMobile && (
                                <div style={{
                                    textAlign: 'center',
                                    paddingBottom: '8px',
                                    borderBottom: '1px solid rgba(255,204,0,0.1)',
                                    marginBottom: '4px',
                                    fontWeight: 'bold',
                                    color: '#ffcc00',
                                    fontSize: '0.9rem'
                                }}>
                                    Select Title
                                </div>
                            )}
                            {/* No Title Option */}
                            <motion.div
                                whileHover={{ x: 2, background: 'rgba(255, 255, 255, 0.08)' }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleTitleClick('None')}
                                style={{
                                    padding: '8px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: selectedTitle === 'None' ? 'linear-gradient(90deg, rgba(255, 204, 0, 0.15), rgba(255, 204, 0, 0.03))' : 'transparent',
                                    border: selectedTitle === 'None' ? '1px solid rgba(255, 204, 0, 0.2)' : '1px solid transparent',
                                    borderRadius: '8px',
                                    color: selectedTitle === 'None' ? '#ffcc00' : 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.75rem',
                                    fontWeight: selectedTitle === 'None' ? '900' : '600',
                                    cursor: 'pointer',
                                    transition: '0.2s all',
                                    whiteSpace: 'nowrap',
                                    gap: '16px'
                                }}
                            >
                                <span style={{
                                    textShadow: selectedTitle === 'None' ? '0 0 8px rgba(255, 204, 0, 0.4)' : 'none'
                                }}>No Title</span>
                                {selectedTitle === 'None' && <Check size={14} color="#ffcc00" strokeWidth={3} />}
                            </motion.div>

                            <div style={{ height: '1px', background: 'rgba(255, 204, 0, 0.15)', margin: '4px 6px' }} />

                            {/* Unlocked Titles */}
                            {unlockedTitles.length > 0 ? (
                                unlockedTitles.map((title) => (
                                    <motion.div
                                        key={title}
                                        whileHover={{ x: 2, background: 'rgba(255, 255, 255, 0.08)' }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleTitleClick(title)}
                                        style={{
                                            padding: '8px 12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: selectedTitle === title ? 'linear-gradient(90deg, rgba(255, 204, 0, 0.15), rgba(255, 204, 0, 0.03))' : 'transparent',
                                            border: selectedTitle === title ? '1px solid rgba(255, 204, 0, 0.2)' : '1px solid transparent',
                                            borderRadius: '8px',
                                            color: selectedTitle === title ? '#ffcc00' : 'rgba(255, 255, 255, 0.9)',
                                            fontSize: '0.75rem',
                                            fontWeight: selectedTitle === title ? '900' : '600',
                                            cursor: 'pointer',
                                            transition: '0.2s all',
                                            whiteSpace: 'nowrap',
                                            gap: '16px'
                                        }}
                                    >
                                        <span style={{
                                            textShadow: selectedTitle === title ? '0 0 8px rgba(255, 204, 0, 0.4)' : 'none'
                                        }}>{title}</span>
                                        {selectedTitle === title && <Check size={14} color="#ffcc00" strokeWidth={3} />}
                                    </motion.div>
                                ))
                            ) : (
                                <div style={{ padding: '8px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                                    No other titles unlocked
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default TitleSelector;
