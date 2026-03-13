import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, LogOut, Shield, Info, Edit2, Save } from 'lucide-react';

export const GuildSettings = ({ 
    guild, 
    playerHasPermission, 
    onLeave, 
    onDisband, 
    onOpenRoles, 
    onShowInfo, 
    onEditCustomization,
    onUpdateSettings,
    settingsPending 
}) => {
    const [minLevel, setMinLevel] = useState(guild.min_level || 1);
    const [joinMode, setJoinMode] = useState(guild.join_mode || 'OPEN');

    const handleSave = () => {
        onUpdateSettings({ minLevel: Number(minLevel), joinMode });
    };

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '0 5px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: '900' }}>Guild Preferences</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                    Configure who can join and view guild information.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {playerHasPermission('edit_appearance') && (
                    <button 
                        onClick={onEditCustomization}
                        style={{ 
                            width: '100%', padding: '14px 18px', borderRadius: '14px', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
                            textAlign: 'left', transition: '0.2s', position: 'relative'
                        }}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={18} color="var(--accent)" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Edit Appearance</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>Guild icon, colors and country</div>
                        </div>
                    </button>
                )}

                {playerHasPermission('manage_roles') && (
                    <button 
                        onClick={onOpenRoles}
                        style={{ 
                            width: '100%', padding: '14px 18px', borderRadius: '14px', 
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
                            textAlign: 'left', transition: '0.2s'
                        }}
                    >
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={18} color="#44aaff" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Manage Roles</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>View and configure guild ranks</div>
                        </div>
                    </button>
                )}

                {playerHasPermission('manage_guild') && (
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '16px 20px',
                        borderRadius: '18px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px', marginBottom: '-4px' }}>JOIN SETTINGS</div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Minimum Level</label>
                            <input
                                type="number"
                                min="1"
                                max="9999"
                                value={minLevel}
                                onChange={(e) => setMinLevel(e.target.value)}
                                style={{
                                    width: '60px', padding: '6px', background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                                    color: '#fff', fontSize: '0.9rem', fontWeight: 'bold', outline: 'none',
                                    textAlign: 'center'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Entry Mode</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[{ id: 'APPLY', label: 'Application' }, { id: 'OPEN', label: 'Open' }].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setJoinMode(mode.id)}
                                        style={{
                                            flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                                            background: joinMode === mode.id ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.02)',
                                            border: joinMode === mode.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                                            color: joinMode === mode.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                                            transition: '0.15s'
                                        }}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={settingsPending}
                            onClick={handleSave}
                            style={{
                                width: '100%', padding: '14px', background: 'var(--accent)', color: '#000',
                                border: 'none', borderRadius: '10px', fontWeight: '900', fontSize: '0.8rem',
                                cursor: settingsPending ? 'not-allowed' : 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: settingsPending ? 0.6 : 1
                            }}
                        >
                            {settingsPending ? <div className="spinner-small" style={{ width: '16px', height: '16px', borderTopColor: '#000' }} /> : <><Save size={16} /> SAVE SETTINGS</>}
                        </motion.button>
                    </div>
                )}
            </div>

            <div style={{ background: 'rgba(255, 68, 68, 0.03)', borderRadius: '18px', border: '1px solid rgba(255, 68, 68, 0.1)', padding: '16px', marginTop: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '0.75rem', color: '#ff4444', marginBottom: '10px', fontWeight: '900', letterSpacing: '0.5px' }}>DANGER ZONE</h4>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={onLeave}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(255, 68, 68, 0.1)', color: '#ff4444', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                    >
                        <LogOut size={14} /> LEAVE
                    </button>

                    {playerHasPermission('disband_guild') && (
                        <button 
                            onClick={onDisband}
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255, 0, 0, 0.15)', border: '1px solid rgba(255, 0, 0, 0.2)', color: '#fff', fontSize: '0.7rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                        >
                            <Trash2 size={14} /> DISBAND
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
