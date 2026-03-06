import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sword, Pickaxe, Coins, Sparkles, Monitor, Smartphone, Trophy, Skull } from 'lucide-react';
import LeaderboardModal from './LeaderboardModal';

const FEATURES = [
    {
        icon: Pickaxe,
        title: 'Gather & Craft',
        desc: 'Master 15+ skills and craft powerful gear'
    },
    {
        icon: Sword,
        title: 'Epic Combat',
        desc: 'Fight monsters, clear dungeons, earn loot'
    },
    {
        icon: Coins,
        title: 'Player Economy',
        desc: 'Trade on a real-time player-driven market'
    },
    {
        icon: Sparkles,
        title: 'Rune System',
        desc: 'Forge and merge runes to boost your power'
    }
];

const LandingPage = ({ onPlay, activePlayers = 0 }) => {
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Floating particles (Magical dust)
    const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.4 + 0.1,
        drift: Math.random() * 40 - 20
    }));

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
            backgroundImage: 'url("/backgrounds/medieval.webp")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}>
            {/* Ambient Overlay & Vignette */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: `
                    radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.9) 100%),
                    linear-gradient(180deg, rgba(8,8,12,0.4) 0%, rgba(8,8,12,0.2) 40%, rgba(8,8,12,0.6) 100%)
                `,
                zIndex: 1, pointerEvents: 'none'
            }} />

            {/* Film Grain / Noise Overlay */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")',
                opacity: 0.05,
                zIndex: 2,
                pointerEvents: 'none',
                mixBlendMode: 'overlay'
            }} />

            {/* Top Navbar */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '12px 16px' : '16px 40px',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 100%)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                height: isMobile ? '60px' : 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        position: 'relative',
                        padding: '2px',
                        background: 'linear-gradient(135deg, #d4af37, #a87f00)',
                        borderRadius: '10px',
                        boxShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                    }}>
                        <img src="/logo.jpg" alt="Eternal Idle" style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', borderRadius: '8px', display: 'block' }} />
                    </div>
                    {!isMobile && (
                        <span style={{
                            fontWeight: '1000',
                            fontSize: '1rem',
                            letterSpacing: '3px',
                            color: '#fff',
                            textShadow: '0 0 10px rgba(255,255,255,0.2)'
                        }}>ETERNAL IDLE</span>
                    )}
                </div>

                <div style={{
                    position: isMobile ? 'static' : 'absolute',
                    left: '50%',
                    transform: isMobile ? 'none' : 'translateX(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '16px' : '32px'
                }}>
                    <span
                        onClick={() => setShowLeaderboard(true)}
                        style={{
                            fontSize: isMobile ? '0.7rem' : '0.85rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase'
                        }}
                    >Leaderboards</span>

                    <a
                        href="https://discord.gg/mMrBuBHW5q"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            fontSize: isMobile ? '0.7rem' : '0.85rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            textDecoration: 'none'
                        }}
                    >Discord</a>
                </div>

                <button
                    onClick={onPlay}
                    style={{
                        padding: isMobile ? '8px 16px' : '10px 24px',
                        background: 'linear-gradient(135deg, #d4af37 0%, #a87f00 100%)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        color: '#000',
                        fontWeight: '900',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onMouseOver={e => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(212,175,55,0.4)';
                    }}
                    onMouseOut={e => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                    }}
                >
                    {isMobile ? 'Play' : 'Sign In'}
                </button>
            </div>

            {/* Floating particles (Magical dust) */}
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    animate={{
                        x: [0, p.drift, 0],
                        y: [0, -50, 0],
                        opacity: [0, p.opacity, 0]
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'easeInOut'
                    }}
                    style={{
                        position: 'fixed',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        background: 'rgba(212, 175, 55, 0.4)',
                        boxShadow: '0 0 8px rgba(212, 175, 55, 0.3)',
                        zIndex: 3,
                        pointerEvents: 'none'
                    }}
                />
            ))}

            {/* Content */}
            <div style={{
                position: 'relative',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? '16px' : '24px',
                padding: isMobile ? '80px 16px 40px 16px' : '120px 20px 60px 20px',
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto'
            }}>
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ textAlign: 'center' }}
                >
                    <h1 style={{
                        fontSize: 'clamp(2rem, 8vw, 4.5rem)',
                        fontWeight: '1000',
                        letterSpacing: 'clamp(8px, 2vw, 20px)',
                        color: '#fff',
                        textTransform: 'uppercase',
                        margin: 0,
                        textShadow: `
                            0 0 20px rgba(212,175,55,0.4),
                            0 0 40px rgba(212,175,55,0.2),
                            0 10px 30px rgba(0,0,0,0.5)
                        `,
                        lineHeight: 1.0,
                        position: 'relative',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        textAlign: 'center'
                    }}>
                        ETERNAL IDLE
                    </h1>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        marginTop: '16px'
                    }}>
                        <div style={{ height: '1px', width: isMobile ? '20px' : '40px', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6))' }} />
                        <p style={{
                            fontSize: isMobile ? '0.65rem' : '0.85rem',
                            fontWeight: '900',
                            letterSpacing: isMobile ? '3px' : '6px',
                            color: '#d4af37',
                            textTransform: 'uppercase',
                            margin: 0
                        }}>
                            IDLE RPG • REAL-TIME ECONOMY
                        </p>
                        <div style={{ height: '1px', width: isMobile ? '20px' : '40px', background: 'linear-gradient(270deg, transparent, rgba(212,175,55,0.6))' }} />
                    </div>
                </motion.div>

                {/* Active Players Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '8px' : '12px',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(20px)',
                        padding: isMobile ? '8px 16px' : '10px 24px',
                        borderRadius: '50px',
                        border: '1px solid rgba(212,175,55,0.3)',
                        boxShadow: '0 0 20px rgba(212,175,55,0.1), inset 0 0 10px rgba(212,175,55,0.05)'
                    }}
                >
                    <span style={{
                        width: '10px', height: '10px',
                        background: '#4ade80',
                        borderRadius: '50%',
                        boxShadow: '0 0 15px #4ade80',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{
                        fontWeight: '1000',
                        fontSize: isMobile ? '0.9rem' : '1.2rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#fff',
                        letterSpacing: '1px'
                    }}>
                        {activePlayers}
                    </span>
                    <span style={{
                        fontSize: isMobile ? '0.6rem' : '0.7rem',
                        fontWeight: '900',
                        letterSpacing: isMobile ? '1.5px' : '3px',
                        color: 'rgba(255,255,255,0.7)',
                        textTransform: 'uppercase'
                    }}>
                        PLAYERS ONLINE
                    </span>
                </motion.div>

                {/* Tagline */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{
                        fontSize: isMobile ? '0.85rem' : '1rem',
                        color: 'rgba(255,255,255,0.7)',
                        textAlign: 'center',
                        maxWidth: isMobile ? '320px' : '450px',
                        lineHeight: 1.6,
                        margin: '5px 0'
                    }}
                >
                    Forge your legend in a persistent realm of magic and steel. Master deep professions, conquer shifting dungeons, and dominate the player-led Grand Market.
                </motion.p>

                {/* CTA Button */}
                <div style={{ position: 'relative', marginTop: '20px' }}>
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        style={{
                            position: 'absolute',
                            top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                            background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)',
                            zIndex: -1,
                            borderRadius: '20px'
                        }}
                    />
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
                        whileHover={{
                            scale: 1.05,
                            boxShadow: '0 0 50px rgba(212,175,55,0.5), 0 15px 40px rgba(0,0,0,0.4)',
                            filter: 'brightness(1.1)'
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onPlay}
                        style={{
                            padding: '20px 80px',
                            background: 'linear-gradient(135deg, #d4af37 0%, #f1c40f 50%, #a87f00 100%)',
                            border: '1px solid rgba(255,255,255,0.4)',
                            borderRadius: '16px',
                            color: '#000',
                            fontWeight: '1000',
                            fontSize: '1.25rem',
                            letterSpacing: '4px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            boxShadow: '0 10px 30px rgba(212,175,55,0.3), 0 15px 40px rgba(0,0,0,0.4)',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <span style={{ position: 'relative', zIndex: 1 }}>PLAY NOW</span>
                        <motion.div
                            animate={{
                                left: ['-100%', '200%']
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: 2,
                                repeatDelay: 4
                            }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                width: '50%',
                                height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                transform: 'skewX(-25deg)',
                                pointerEvents: 'none'
                            }}
                        />
                    </motion.button>
                </div>

                {/* Discord Link (Moved up / subtle style) */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '60px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '12px 28px',
                            background: 'rgba(255,255,255,0.03)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)' }}>
                            <Monitor size={18} color="#d4af37" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px' }}>DESKTOP</span>
                        </div>
                        <div style={{
                            width: '1px', height: '20px',
                            background: 'rgba(255,255,255,0.1)'
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.6)' }}>
                            <Smartphone size={18} color="#d4af37" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '2px' }}>MOBILE</span>
                        </div>
                    </motion.div>
                    <div style={{ width: '60px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                {/* Feature Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                        gap: isMobile ? '12px' : '20px',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '550px',
                        marginTop: '10px',
                        padding: isMobile ? '0 10px' : '0'
                    }}
                >
                    {FEATURES.map((feat, i) => (
                        <motion.div
                            key={feat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 + i * 0.1 }}
                            whileHover={{
                                y: -8,
                                background: 'rgba(255,255,255,0.08)',
                                borderColor: 'rgba(212,175,55,0.3)',
                                boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '18px 24px',
                                background: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(30px)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: 'default'
                            }}
                        >
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.2))',
                                padding: '12px',
                                borderRadius: '14px',
                                display: 'flex',
                                flexShrink: 0,
                                boxShadow: '0 0 15px rgba(212,175,55,0.1)'
                            }}>
                                <feat.icon size={24} color="#d4af37" />
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '0.95rem',
                                    fontWeight: '1000',
                                    color: '#fff',
                                    letterSpacing: '1px'
                                }}>
                                    {feat.title}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontWeight: '700',
                                    marginTop: '4px',
                                    lineHeight: 1.4
                                }}>
                                    {feat.desc}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Footer branding */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 2 }}
                    style={{
                        marginTop: '15px',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        letterSpacing: '3px',
                        textAlign: 'center',
                        paddingBottom: '20px'
                    }}
                >
                    ETERNAL IDLE • RPG WORLD
                </motion.div>
            </div>
            <LeaderboardModal
                isOpen={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                isPublic={true}
                isMobile={isMobile}
            />

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
