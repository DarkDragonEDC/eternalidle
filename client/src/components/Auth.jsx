import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const Auth = ({ onLogin, initialView = 'LOGIN' }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [view, setView] = useState(initialView); // 'LOGIN', 'REGISTER', 'FORGOT', 'RESET'
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
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await fetch(`${apiUrl}/api/active_players`);
                if (res.ok) {
                    const data = await res.json();
                    setActivePlayers(data.count || 0);
                }
            } catch (err) {
                // Silently fallback if needed, but logging helps debug
                console.warn('Could not fetch active players count');
            }
        };

        fetchActivePlayers();
        const interval = setInterval(fetchActivePlayers, 15000); // 15s is enough
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #2a2a2a 0%, #0d0d0d 100%)',
            fontFamily: 'system-ui, sans-serif',
            color: '#fff',
            position: 'relative'
        }}>
            {/* Active Players at Top */}
            <div style={{
                position: 'absolute',
                top: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.8rem',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                zIndex: 10
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(212, 175, 55, 0.1)',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    color: '#d4af37'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        background: '#44ff44',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #44ff44'
                    }}></span>
                    <span style={{ fontWeight: 'bold' }}>{activePlayers}</span>
                    <span style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>ACTIVE PLAYERS</span>
                </div>
            </div>
            <div style={{
                width: '380px',
                padding: '2rem',
                background: 'rgba(20, 20, 20, 0.8)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 0 40px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Logo and Title */}
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <img
                        src="/logo.png"
                        alt="Forged Lands Logo"
                        style={{ width: '120px', height: 'auto', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.3))' }}
                    />
                    <h1 style={{
                        color: 'var(--accent, #d4af37)',
                        margin: 0,
                        fontSize: '2rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        Forged Lands
                    </h1>
                    <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent, #d4af37), transparent)', width: '100%', marginTop: '10px', opacity: 0.5 }}></div>
                </div>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {view !== 'RESET' && (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                color: '#aaa',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                letterSpacing: '1px'
                            }}>
                                EMAIL ADDRESS
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                disabled={isLoading}
                                value={username}
                                onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
                                required
                                placeholder="email@example.com"
                            />
                        </div>
                    )}

                    {view !== 'FORGOT' && view !== 'RESET' && (
                        <div style={{ marginBottom: view === 'LOGIN' ? '0.5rem' : '2rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                color: '#aaa',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                letterSpacing: '1px'
                            }}>
                                PASSWORD
                            </label>
                            <input
                                type="password"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#d4af37'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                disabled={isLoading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••"
                            />
                        </div>
                    )}

                    {view === 'LOGIN' && (
                        <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
                            <span
                                onClick={() => { setView('FORGOT'); setError(''); setMessage(''); }}
                                style={{ color: '#888', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Forgot Password?
                            </span>
                        </div>
                    )}

                    {view === 'RESET' && (
                        <>
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                                    NEW PASSWORD
                                </label>
                                <input
                                    type="password"
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="••••••"
                                />
                            </div>
                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                                    CONFIRM NEW PASSWORD
                                </label>
                                <input
                                    type="password"
                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '1rem', outline: 'none' }}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••"
                                />
                            </div>
                        </>
                    )}

                    {error && (
                        <div style={{
                            background: 'rgba(255, 68, 68, 0.1)',
                            border: '1px solid rgba(255, 68, 68, 0.3)',
                            color: '#ff4444',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {message && (
                        <div style={{
                            background: 'rgba(68, 255, 68, 0.1)',
                            border: '1px solid rgba(68, 255, 68, 0.3)',
                            color: '#44ff44',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
                            textAlign: 'center'
                        }}>
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            marginBottom: '1.5rem',
                            background: isLoading
                                ? 'rgba(212, 175, 55, 0.5)'
                                : 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                            transition: 'all 0.1s',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading
                            ? (view === 'REGISTER' ? 'CREATING ACCOUNT...' : view === 'FORGOT' ? 'SENDING...' : view === 'RESET' ? 'UPDATING...' : 'STARTING JOURNEY...')
                            : (view === 'REGISTER' ? 'CREATE ACCOUNT' : view === 'FORGOT' ? 'SEND RESET LINK' : view === 'RESET' ? 'UPDATE PASSWORD' : 'START JOURNEY')}
                    </button>

                    <div
                        onClick={() => {
                            if (isLoading) return;
                            if (view === 'LOGIN') setView('REGISTER');
                            else setView('LOGIN');
                            setError('');
                            setMessage('');
                        }}
                        style={{
                            color: '#888',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span>
                            {view === 'REGISTER' ? 'Already an adventurer?' : view === 'FORGOT' ? 'Remembered?' : view === 'RESET' ? 'Back to' : 'New here?'}
                        </span>
                        <span style={{ color: '#d4af37', fontWeight: 'bold' }}>
                            {view === 'REGISTER' ? 'Login' : view === 'FORGOT' ? 'Login' : view === 'RESET' ? 'Login' : 'Create Account'}
                        </span>
                    </div>
                </form>
            </div>


            <div style={{
                position: 'absolute',
                bottom: '20px',
                color: 'rgba(255,255,255,0.1)',
                fontSize: '0.7rem'
            }}>
                FORGED LANDS v2.0.0 • SERVER-SIDE RPG
            </div>
        </div>
    );
};

export default Auth;
