import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, Lock, Mail, Key, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Auth = ({ onLogin, initialView = 'LOGIN' }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [view, setView] = useState(initialView); // 'LOGIN', 'REGISTER', 'FORGOT', 'RESET'
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [activePlayers, setActivePlayers] = useState(0);

    useEffect(() => {
        const fetchActivePlayers = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/api/active_players`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePlayers(data.count || 0);
                }
            } catch (err) {
                console.warn('Could not fetch active players count');
            }
        };

        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isLoading) return;
        setError('');
        setMessage('');
        setIsLoading(true);

        const email = username.trim().toLowerCase();
        const cleanPassword = password.trim();

        try {
            if (view === 'REGISTER') {
                const { data, error: regError } = await supabase.auth.signUp({
                    email,
                    password: cleanPassword,
                });
                if (regError) {
                    setError(regError.message);
                } else {
                    setView('LOGIN');
                    setMessage('Registration successful! Now please log in.');
                }
            } else if (view === 'LOGIN') {
                const { data, error: logError } = await supabase.auth.signInWithPassword({
                    email,
                    password: cleanPassword,
                });
                if (logError) {
                    setError(logError.message);
                } else {
                    onLogin(data.session);
                }
            } else if (view === 'FORGOT') {
                const { error: forgotError } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/`,
                });
                if (forgotError) {
                    setError(forgotError.message);
                } else {
                    setMessage('Check your email for the reset link!');
                }
            } else if (view === 'RESET') {
                if (newPassword !== confirmPassword) {
                    setError("Passwords don't match!");
                    setIsLoading(false);
                    return;
                }
                const { error: resetError } = await supabase.auth.updateUser({
                    password: newPassword,
                });
                if (resetError) {
                    setError(resetError.message);
                } else {
                    setMessage('Password updated! You can now log in.');
                    setView('LOGIN');
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
        },
        exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e2330 0%, #0a0c10 100%)',
            fontFamily: "'Inter', sans-serif",
            color: 'var(--text-main)',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Animated Background Orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute', top: '10%', left: '10%',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: 0
                }}
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.1, 0.2, 0.1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute', bottom: '10%', right: '10%',
                    width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(144, 213, 255, 0.1) 0%, transparent 70%)',
                    filter: 'blur(80px)', zIndex: 0
                }}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{
                        maxWidth: '400px',
                        width: '95vw',
                        padding: '1rem 1.5rem',
                        background: 'rgba(20, 25, 35, 0.7)',
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                        borderRadius: '28px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 1,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Glossy Overlay */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                        pointerEvents: 'none'
                    }} />

                    {/* Active Players Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'rgba(212, 175, 55, 0.08)', padding: '4px 12px',
                            borderRadius: '24px', border: '1px solid rgba(212, 175, 55, 0.2)',
                            color: '#d4af37', marginBottom: '1rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    >
                        <span style={{
                            width: '8px', height: '8px', background: '#4ade80', borderRadius: '50%',
                            boxShadow: '0 0 10px #4ade80', animation: 'pulse 2s infinite'
                        }} />
                        <span style={{ fontWeight: '900', fontSize: '0.9rem', fontFamily: 'monospace' }}>{activePlayers}</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '2px' }}>ONLINE</span>
                    </motion.div>

                    {/* Logo Area */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{ marginBottom: '1rem', textAlign: 'center' }}
                    >
                        <img
                            src="/logo.jpg"
                            alt="Eternal Idle"
                            style={{
                                width: '100px', borderRadius: '16px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.4), 0 0 15px rgba(212,175,55,0.15)',
                                marginBottom: '0.6rem',
                                border: '1px solid rgba(212,175,55,0.1)'
                            }}
                        />
                        <h1 style={{
                            fontSize: '1.2rem', fontWeight: '900', letterSpacing: '4px',
                            background: 'linear-gradient(to bottom, #fff 30%, #d4af37 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            textTransform: 'uppercase', margin: 0
                        }}>
                            ETERNAL IDLE
                        </h1>
                    </motion.div>

                    <form onSubmit={handleSubmit} style={{ width: '100%', position: 'relative', zIndex: 1 }}>
                        {view === 'LOGIN' && !showEmailForm && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                <motion.button
                                    whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #d4af37 0%, #a87f00 100%)', color: '#000' }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => setShowEmailForm(true)}
                                    style={{
                                        ...outlineButtonStyle,
                                        borderColor: 'rgba(212, 175, 55, 0.4)',
                                        color: '#d4af37',
                                        background: 'rgba(212, 175, 55, 0.05)',
                                        padding: '12px',
                                        height: '54px'
                                    }}
                                >
                                    <Mail size={18} />
                                    <span>SIGN IN WITH EMAIL</span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        // Try to recover existing session first
                                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                                        if (session && session.user.is_anonymous) {
                                            if (onLogin) onLogin(session); // Resume session
                                            else window.location.reload(); // Fallback if no onLogin provided
                                        } else {
                                            // Only create new if no existing anonymous session
                                            const { data, error: guestError } = await supabase.auth.signInAnonymously();
                                            if (guestError) setError(guestError.message);
                                            else onLogin(data.session);
                                        }
                                        setIsLoading(false);
                                    }}
                                    disabled={isLoading}
                                    style={{ ...guestButtonStyle, margin: 0, padding: '12px', height: '54px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                        <div style={{ background: 'rgba(212, 175, 55, 0.2)', padding: '6px', borderRadius: '8px' }}>
                                            <Sparkles size={16} color="#d4af37" />
                                        </div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '900', letterSpacing: '1px' }}>PLAY AS GUEST</div>
                                            <div style={{ fontSize: '0.55rem', opacity: 1, fontWeight: 'bold' }}>INSTANT ACCESS • NO EMAIL</div>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                                    style={{ ...outlineButtonStyle, padding: '12px', height: '54px' }}
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="G" />
                                    <span>CONTINUE WITH GOOGLE</span>
                                </motion.button>
                            </div>
                        )}

                        <AnimatePresence>
                            {(view !== 'LOGIN' || showEmailForm) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden', width: '100%' }}
                                >
                                    {view !== 'RESET' && (
                                        <div style={{ marginBottom: '0.8rem' }}>
                                            <label style={labelStyle}>EMAIL ADDRESS</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={16} style={inputIconStyle} />
                                                <input
                                                    type="email"
                                                    style={inputStyle}
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    placeholder="Enter your email"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {view !== 'FORGOT' && view !== 'RESET' && (
                                        <div style={{ marginBottom: view === 'LOGIN' ? '0.8rem' : '1.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={labelStyle}>PASSWORD</label>
                                                {view === 'LOGIN' && (
                                                    <span
                                                        onClick={() => setView('FORGOT')}
                                                        style={{ color: 'var(--text-dim)', fontSize: '0.6rem', cursor: 'pointer', transition: '0.2s', fontWeight: '800', letterSpacing: '1px', marginBottom: '0.4rem' }}
                                                        onMouseOver={(e) => e.target.style.color = 'var(--accent)'}
                                                        onMouseOut={(e) => e.target.style.color = 'var(--text-dim)'}
                                                    >
                                                        Forgot password?
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <Key size={16} style={inputIconStyle} />
                                                <input
                                                    type="password"
                                                    style={inputStyle}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={errorStyle}>
                                            {error}
                                        </motion.div>
                                    )}
                                    {message && (
                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={successStyle}>
                                            {message}
                                        </motion.div>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={isLoading}
                                        style={{
                                            ...primaryButtonStyle,
                                            background: isLoading ? '#666' : 'linear-gradient(135deg, #d4af37 0%, #a87f00 100%)',
                                            boxShadow: isLoading ? 'none' : '0 10px 25px rgba(212, 175, 55, 0.3)',
                                            padding: '10px'
                                        }}
                                    >
                                        {isLoading ? 'PLEASE WAIT...' : (view === 'LOGIN' ? 'START JOURNEY' : 'CONFIRM')}
                                        {!isLoading && <ArrowRight size={18} style={{ marginLeft: '10px' }} />}
                                    </motion.button>

                                    {view === 'LOGIN' && showEmailForm && (
                                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                            <span
                                                onClick={() => setShowEmailForm(false)}
                                                style={{ color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                            >
                                                ← Back to methods
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <span
                                onClick={() => setView(view === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                                style={{ color: 'var(--text-dim)', fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                {view === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                                <strong style={{ color: 'var(--accent)', marginLeft: '5px' }}>
                                    {view === 'LOGIN' ? 'Join now' : 'Log in'}
                                </strong>
                            </span>
                        </div>
                    </form>
                </motion.div>
            </AnimatePresence>

            <div style={{
                position: 'absolute', bottom: '25px', color: 'rgba(255,255,255,0.15)',
                fontSize: '0.75rem', fontWeight: '900', letterSpacing: '3px'
            }}>
                ETERNAL IDLE • RPG WORLD
            </div>

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

const labelStyle = {
    display: 'block', fontSize: '0.6rem', color: 'var(--text-dim)',
    fontWeight: '800', marginBottom: '0.4rem', letterSpacing: '1.5px',
};

const inputStyle = {
    width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px',
    color: '#fff', fontSize: '0.9rem', outline: 'none', transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const inputIconStyle = {
    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
    color: 'rgba(255,255,255,0.2)', pointerEvents: 'none'
};

const primaryButtonStyle = {
    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
    color: '#000', fontWeight: '900', fontSize: '1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)', textTransform: 'uppercase',
    letterSpacing: '2px'
};

const guestButtonStyle = {
    width: '100%', padding: '10px', marginBottom: '0.75rem',
    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
    border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: '12px',
    color: '#d4af37', cursor: 'pointer', transition: '0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const outlineButtonStyle = {
    width: '100%', padding: '10px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
    color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
};

const errorStyle = {
    background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)',
    color: '#ff6b6b', padding: '12px', borderRadius: '12px', fontSize: '0.85rem',
    marginBottom: '1.5rem', textAlign: 'center', fontWeight: '600'
};

const successStyle = {
    background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)',
    color: '#4ade80', padding: '12px', borderRadius: '12px', fontSize: '0.85rem',
    marginBottom: '1.5rem', textAlign: 'center', fontWeight: '600'
};

export default Auth;
