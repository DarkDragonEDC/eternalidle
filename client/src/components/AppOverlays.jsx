import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, LogOut, AlertTriangle, Zap, Lock, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';

const DISCORD_LINK = "https://discord.gg/uVGYW2gJtB";

export const VersionMismatchOverlay = () => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.95)', zIndex: 999999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '20px', textAlign: 'center'
    }}>
        <div style={{
            background: 'var(--panel-bg)', padding: '40px', borderRadius: '20px',
            border: '2px solid var(--accent)', boxShadow: '0 0 30px var(--accent-soft)',
            maxWidth: '500px'
        }}>
            <h1 style={{ color: 'var(--accent)', marginBottom: '20px' }}>UPDATE REQUIRED</h1>
            <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '30px' }}>
                A new version of Eternal Idle is available, but your browser is struggling to update.
            </p>
            <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>
                Please close all game tabs and try clearing your browser cache if this persists.
            </p>
            <button
                onClick={() => {
                    sessionStorage.setItem('version_reload_count', '0');
                    window.location.reload(true);
                }}
                style={{
                    background: 'var(--accent)', color: 'black', padding: '15px 40px',
                    borderRadius: '10px', fontSize: '1.2rem', fontWeight: '900',
                    border: 'none', cursor: 'pointer', transition: '0.2s'
                }}
            >
                TRY AGAIN
            </button>
        </div>
    </div>
);

export const BannedOverlay = ({ banModalData }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: '20px'
    }}>
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={{
                background: 'var(--panel-bg)', border: '1px solid #ff4444',
                borderRadius: '24px', padding: '30px', maxWidth: '400px', width: '100%',
                textAlign: 'center', boxShadow: '0 20px 60px rgba(255, 68, 68, 0.1)'
            }}
        >
            <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(255, 68, 68, 0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
                <ShieldAlert size={30} color="#ff4444" />
            </div>
            <h2 style={{ color: '#ff4444', fontSize: '1.4rem', fontWeight: '800', margin: '0 0 12px' }}>
                ACCESS RESTRICTED
            </h2>
            <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 24px' }}>
                Your account has been {banModalData.level === 3 ? 'permanently' : 'temporarily'} restricted.
                <br />
                Reason: <strong style={{ color: '#ffaa00' }}>"{banModalData.reason || (banModalData.message && banModalData.message.split('Reason: ')[1]?.split('.')[0]) || 'Account Violation'}"</strong>
                {banModalData.level === 2 && (
                    <>
                        <br />
                        Remaining: <strong style={{ color: 'var(--text-main)' }}>{banModalData.remaining || (banModalData.message && banModalData.message.split('Remaining: ')[1]) || '24h'}</strong>
                    </>
                )}
            </p>

            <div style={{
                margin: '20px 0', padding: '15px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '12px' }}>
                    Need help or want to appeal?
                </p>
                <a
                    href={DISCORD_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        color: '#5865F2', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem',
                        padding: '10px', borderRadius: '8px', background: 'rgba(88, 101, 242, 0.1)',
                        transition: '0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(88, 101, 242, 0.2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(88, 101, 242, 0.1)'}
                >
                    <MessageCircle size={18} />
                    CONTACT VIA DISCORD
                </a>
            </div>

            <button
                onClick={async () => {
                    await supabase.auth.signOut();
                    localStorage.clear();
                    window.location.reload();
                }}
                style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: 'rgba(52, 73, 94, 0.4)', color: 'white', fontWeight: '700',
                    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    marginTop: '10px'
                }}
            >
                <LogOut size={18} />
                LOGOUT
            </button>
        </motion.div>
    </div>
);

export const BanWarningOverlay = ({ banWarning, setBanWarning, socket }) => {
    const [banWarningRead, setBanWarningRead] = useState(false);

    return (
        <AnimatePresence>
            {banWarning && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 99998, padding: '20px'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        style={{
                            background: 'var(--panel-bg)', border: '1px solid #ffaa00',
                            borderRadius: '24px', padding: '30px', maxWidth: '400px', width: '100%',
                            textAlign: 'center', boxShadow: '0 20px 50px rgba(255, 170, 0, 0.1)'
                        }}
                    >
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: 'rgba(255, 170, 0, 0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                        }}>
                            <AlertTriangle size={30} color="#ffaa00" />
                        </div>
                        <h3 style={{ color: '#ffaa00', fontSize: '1.4rem', fontWeight: '800', margin: '0 0 12px' }}>
                            Behavioral Warning
                        </h3>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 24px' }}>
                            This is a formal warning regarding your account:
                            <br />
                            <strong style={{ color: '#ffaa00' }}>"{banWarning}"</strong>
                            <br /><br />
                            Please follow the game rules to avoid 24h or permanent bans.
                        </p>

                        <div style={{
                            margin: '0 0 24px', padding: '15px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '12px' }}>
                                For rules or support, join us:
                            </p>
                            <a
                                href={DISCORD_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    color: '#5865F2', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem',
                                    padding: '10px', borderRadius: '8px', background: 'rgba(88, 101, 242, 0.1)',
                                    transition: '0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(88, 101, 242, 0.2)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(88, 101, 242, 0.1)'}
                            >
                                <MessageCircle size={18} />
                                CONTACT VIA DISCORD
                            </a>
                        </div>

                        <div
                            onClick={() => setBanWarningRead(!banWarningRead)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                justifyContent: 'center', marginBottom: '24px', cursor: 'pointer',
                                padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <div style={{
                                width: '20px', height: '20px', borderRadius: '6px',
                                border: `2px solid ${banWarningRead ? '#ffaa00' : 'rgba(255,255,255,0.2)'}`,
                                background: banWarningRead ? '#ffaa00' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}>
                                {banWarningRead && <Zap size={14} color="#000" />}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: banWarningRead ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                I have read and understood
                            </span>
                        </div>

                        <button
                            disabled={!banWarningRead}
                            onClick={() => {
                                socket?.emit('acknowledge_ban_warning');
                                setBanWarning(null);
                                setBanWarningRead(false);
                            }}
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px',
                                background: banWarningRead ? '#ffaa00' : 'rgba(255,255,255,0.05)',
                                color: banWarningRead ? '#000' : 'rgba(255,255,255,0.2)',
                                fontWeight: '800', border: 'none', cursor: banWarningRead ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s', fontSize: '0.95rem', letterSpacing: '1px'
                            }}
                        >
                            CONFIRM
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const GuestRestrictionModal = ({ onClose }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 11000, padding: '20px'
    }} onClick={onClose}>
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            style={{
                background: 'var(--panel-bg)', border: '1px solid var(--border-active)',
                borderRadius: '24px', padding: '40px', maxWidth: '450px', width: '100%',
                textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative', overflow: 'hidden'
            }}
        >
            <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'rgba(255, 107, 107, 0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px',
                border: '1px solid rgba(255, 107, 107, 0.2)'
            }}>
                <Lock size={40} color="#ff6b6b" />
            </div>
            <h2 style={{ margin: '0 0 15px', color: 'var(--text-main)', fontSize: '1.8rem', fontWeight: '900' }}>FEATURE LOCKED</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '1rem', lineHeight: '1.6', margin: '0 0 30px' }}>
                Marketplace, Trading and Daily Spin are premium features reserved for permanent accounts.
                <br /><br />
                <strong style={{ color: 'var(--text-main)' }}>Link your account now</strong> to protect your progress and join the player economy!
            </p>
            <button
                onClick={onClose}
                style={{
                    width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
                    color: '#fff', fontSize: '1rem', fontWeight: '800', cursor: 'pointer'
                }}
            >
                GOT IT
            </button>
        </motion.div>
    </div>
);
