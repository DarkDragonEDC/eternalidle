import React, { useState } from 'react';
import { X, Megaphone, Check, Server, User, TrendingUp, Coins, RotateCcw, Rocket } from 'lucide-react';

const ANNOUNCEMENT_ID = 'ALPHA_WELCOME_V1';
const LAUNCH_DATE = new Date(); // Or explicit date

const AnnouncementModal = ({ onClose, userId }) => {
    const [markedRead, setMarkedRead] = useState(false);

    const handleMarkRead = () => {
        const key = `announcement_read_${ANNOUNCEMENT_ID}_${userId || 'guest'}`;
        localStorage.setItem(key, 'true');
        setMarkedRead(true);
        setTimeout(() => onClose(), 600);
    };

    const Section = ({ icon, title, children }) => (
        <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid rgba(255,255,255,0.06)'
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '12px', paddingBottom: '8px',
                borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
                {icon}
                <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {title}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {children}
            </div>
        </div>
    );

    const Item = ({ text, color = '#ccc', kept = false }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color }}>
            <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: kept ? '#4caf50' : '#ff5252',
                flexShrink: 0
            }} />
            <span>{text}</span>
        </div>
    );

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 15000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(12px)',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(10,15,30,0.98))',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '85vh',
                overflow: 'hidden',
                boxShadow: '0 0 60px rgba(212, 175, 55, 0.1), 0 20px 60px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'announceFadeIn 0.4s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(33, 150, 243, 0.1))',
                    padding: '24px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'rgba(255,255,255,0.05)', border: 'none',
                        color: '#666', cursor: 'pointer', padding: '6px',
                        borderRadius: '8px', display: 'flex'
                    }}>
                        <X size={18} />
                    </button>

                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '10px', marginBottom: '8px'
                    }}>
                        <Megaphone size={22} color="var(--accent)" />
                        <span style={{
                            fontSize: '0.7rem', fontWeight: '900',
                            color: 'var(--accent)', letterSpacing: '2px',
                            textTransform: 'uppercase'
                        }}>
                            Important Announcement
                        </span>
                    </div>

                    <h2 style={{
                        margin: 0, fontSize: '1.3rem', fontWeight: '900',
                        background: 'linear-gradient(135deg, #fff, var(--accent))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.5px'
                    }}>
                        Welcome to the Alpha!
                    </h2>

                    <div style={{
                        marginTop: '10px', fontSize: '0.8rem', color: '#aaa', lineHeight: 1.4
                    }}>
                        We are thrilled to officially enter the <strong style={{ color: '#4caf50' }}>Alpha</strong> phase.
                        The early wipes are behind us, and it's time to forge your legacy!
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0
                }}>

                    <Section icon={<Rocket size={16} color="#4caf50" />} title="The Journey Ahead">
                        <Item text="All core systems are now online and persisting." kept />
                        <Item text="New content, items, and dungeons will be introduced regularly." kept />
                    </Section>

                    <Section icon={<TrendingUp size={16} color="#ff9800" />} title="Balancing & Testing">
                        <Item text="This phase focuses heavily on economy and combat balancing." color="#ccc" />
                        <Item text="Drop rates, exp scaling, and boss health may be adjusted on the fly." color="#ccc" />
                        <Item text="Your active gameplay provides the raw data we need to perfect the game." color="#ccc" />
                    </Section>

                    <Section icon={<Server size={16} color="#42a5f5" />} title="Reporting Bugs">
                        <Item text="You will encounter bugs, strange behaviors, and UI glitches." color="#ff5252" />
                        <Item text="Please report any unusual issues directly on our Discord." color="#ccc" />
                        <Item text="Feedback on quality of life improvements is highly encouraged." color="#ccc" />
                    </Section>

                    {/* Thank you message */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(76,175,80,0.08), rgba(33,150,243,0.08))',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(76,175,80,0.15)',
                        textAlign: 'center',
                        marginBottom: '4px'
                    }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: '#aaa', lineHeight: '1.5' }}>
                            We count on your help to report bugs, test the balance of the new mechanics, and share your suggestions.
                            Together we will make Eternal Idle incredible!
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Check size={16} color="#4caf50" />
                            Thank you for being part of this journey!
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    background: 'rgba(0,0,0,0.2)'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            color: '#888',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: '0.2s'
                        }}
                    >
                        CLOSE
                    </button>
                    <a
                        href="https://discord.gg/uVGYW2gJtB"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: '1px solid rgba(88, 101, 242, 0.4)',
                            background: 'rgba(88, 101, 242, 0.15)',
                            color: '#7289da',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: '0.2s',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#7289da">
                            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
                        </svg>
                        Discord
                    </a>
                    <button
                        onClick={handleMarkRead}
                        disabled={markedRead}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '10px',
                            border: 'none',
                            background: markedRead
                                ? 'rgba(76, 175, 80, 0.3)'
                                : 'linear-gradient(135deg, var(--accent) 0%, #2196f3 100%)',
                            color: markedRead ? '#4caf50' : '#000',
                            fontSize: '0.8rem',
                            fontWeight: '900',
                            cursor: markedRead ? 'default' : 'pointer',
                            transition: '0.3s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}
                    >
                        {markedRead ? (
                            <><Check size={16} /> Read</>
                        ) : (
                            <><Check size={16} /> Mark as Read</>
                        )}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes announceFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export const shouldShowAnnouncement = (userId) => {
    const key = `announcement_read_${ANNOUNCEMENT_ID}_${userId || 'guest'}`;
    return !localStorage.getItem(key);
};

export default AnnouncementModal;
