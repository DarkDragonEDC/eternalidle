import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, LogOut, Link2, Monitor, Backpack, BellOff, Bell, ImageOff, Image } from 'lucide-react';
import { supabase } from '../supabase';

const SettingsModal = ({
    isOpen,
    onClose,
    settings,
    setSettings,
    session,
    isGoogleLinked
}) => {
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'absolute', inset: 0, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        style={{
                            width: '100%', maxWidth: '450px',
                            background: 'var(--panel-bg)',
                            borderRadius: '24px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            backdropFilter: 'blur(20px)',
                            maxHeight: '90vh'
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Settings size={20} color="var(--text-main)" />
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px' }}>Settings</h2>
                            </div>
                            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '30px', overflowY: 'auto' }}>

                            {/* Interface Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Interface & Display</h3>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Monitor size={18} color="var(--accent)" />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Text Size</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Adjust the overall scale of the app.</div>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.textSize || 'medium'}
                                        onChange={(e) => handleSettingChange('textSize', e.target.value)}
                                        style={{
                                            background: 'var(--slot-bg)', color: 'var(--text-main)',
                                            border: '1px solid var(--border)', borderRadius: '8px',
                                            padding: '8px 12px', outline: 'none', cursor: 'pointer',
                                            fontWeight: 'bold', fontSize: '0.8rem'
                                        }}
                                    >
                                        <option value="small">Small</option>
                                        <option value="medium">Medium</option>
                                        <option value="large">Large</option>
                                    </select>
                                </div>

                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {settings.hideAvatarBg ? <ImageOff size={18} color="#f87171" /> : <Image size={18} color="var(--accent)" />}
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Hide Profile Background</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Removes the avatar image from the profile background.</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.hideAvatarBg || false}
                                        onChange={(e) => handleSettingChange('hideAvatarBg', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                    />
                                </label>
                            </div>

                            {/* Gameplay Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Gameplay</h3>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent-soft)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Backpack size={18} color="var(--accent)" />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Auto-Sort Inventory</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Choose how to organize your items.</div>
                                        </div>
                                    </div>
                                    <select
                                        value={settings.autoSortInventory || 'off'}
                                        onChange={(e) => handleSettingChange('autoSortInventory', e.target.value)}
                                        style={{
                                            background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)',
                                            border: '1px solid var(--border)', borderRadius: '8px',
                                            padding: '8px 12px', outline: 'none', cursor: 'pointer',
                                            fontWeight: 'bold', fontSize: '0.8rem'
                                        }}
                                    >
                                        <option value="off">Off</option>
                                        <option value="name">Name</option>
                                        <option value="tier">Tier</option>
                                        <option value="type">Type</option>
                                        <option value="value">Value</option>
                                        <option value="quality">Quality</option>
                                        <option value="quantity">Quantity</option>
                                        <option value="date">Date</option>
                                    </select>
                                </div>

                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {settings.hideCollectionPopups ? <BellOff size={18} color="#f87171" /> : <Bell size={18} color="var(--accent)" />}
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Hide Collection Popups</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Silences standard gathering success toasts.</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.hideCollectionPopups || false}
                                        onChange={(e) => handleSettingChange('hideCollectionPopups', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <BellOff size={18} color={settings.disableOfflineModal ? "#f87171" : "var(--accent)"} />
                                        <div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Disable Offline Gains Modal</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Prevents the summary of offline earnings from appearing when you log in.</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.disableOfflineModal || false}
                                        onChange={(e) => handleSettingChange('disableOfflineModal', e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                                    />
                                </label>
                            </div>

                            {/* Account Settings */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <h3 style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Management</h3>

                                <div style={{ background: 'var(--accent-soft)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.4' }}>
                                        {isGoogleLinked
                                            ? "Your account is successfully linked to Google. You can use one-click login anytime."
                                            : "Link your Google account to enable one-click login and secure your progress. This is recommended if you registered with an email/password."}
                                    </p>

                                    {isGoogleLinked ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            padding: '12px 20px',
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '8px',
                                            color: '#4ade80',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            width: '100%'
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 18 18">
                                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                                <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                                            </svg>
                                            GOOGLE ACCOUNT LINKED
                                        </div>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.auth.linkIdentity({
                                                    provider: 'google',
                                                    options: { redirectTo: window.location.origin }
                                                });
                                                if (error) alert(error.message);
                                                else alert('Verification email sent or linking process started. Follow the instructions to complete.');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                padding: '12px 20px',
                                                background: 'var(--panel-bg)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '8px',
                                                color: 'var(--text-main)',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: '0.2s',
                                                width: '100%'
                                            }}
                                            onMouseEnter={(e) => e.target.style.background = 'var(--accent-soft)'}
                                            onMouseLeave={(e) => e.target.style.background = 'var(--panel-bg)'}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 18 18">
                                                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.248h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.248c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                                                <path fill="#FBBC05" d="M3.964 10.719c-.18-.54-.282-1.117-.282-1.719s.102-1.179.282-1.719V4.949H.957C.347 6.169 0 7.548 0 9s.347 2.831.957 4.051l3.007-2.332z" />
                                                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.949L3.964 7.28c.708-2.127 2.692-3.711 5.036-3.711z" />
                                            </svg>
                                            LINK GOOGLE ACCOUNT
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SettingsModal;
