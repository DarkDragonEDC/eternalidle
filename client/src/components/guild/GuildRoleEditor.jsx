import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Shield } from 'lucide-react';

const PERMISSIONS = [
    { id: 'edit_appearance', name: 'Edit Appearance', desc: 'Change guild name, tag, icon, and colors.' },
    { id: 'manage_roles', name: 'Manage Roles', desc: 'Create, edit, delete roles and change guild settings.' },
    { id: 'kick_members', name: 'Kick Members', desc: 'Remove members from the guild (except leaders).' },
    { id: 'manage_requests', name: 'Manage Requests', desc: 'Accept or reject join applications.' },
    { id: 'change_member_roles', name: 'Change Member Roles', desc: "Promote or demote members (up to your own rank)." },
    { id: 'manage_upgrades', name: 'Manage Upgrades', desc: 'Initiate building upgrades in the guild hall.' }
];

const COLORS = ['#ffffff', '#ff4444', '#44aaff', '#44ff44', '#ffd700', '#ff8800', '#808080', '#c0c0c0'];

export const GuildRoleEditor = ({ 
    role, 
    onSave, 
    onCancel, 
    isNew = false 
}) => {
    const [name, setName] = useState(role?.name || '');
    const [color, setColor] = useState(role?.color || '#ffffff');
    const [permissions, setPermissions] = useState(role?.permissions || []);

    const togglePermission = (permId) => {
        setPermissions(prev => 
            prev.includes(permId) 
                ? prev.filter(p => p !== permId) 
                : [...prev, permId]
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase' }}>Role Identity</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{
                        width: '42px', height: '42px', background: 'rgba(0,0,0,0.3)', 
                        borderRadius: '12px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', border: `2px solid ${color}`
                    }}>
                        <Shield size={20} color={color} />
                    </div>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Role Name"
                        style={{ flex: 1, padding: '10px 15px', background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.9rem' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase' }}>Role Color</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COLORS.map(c => (
                        <div 
                            key={c} 
                            onClick={() => setColor(c)}
                            style={{ 
                                width: '28px', height: '28px', borderRadius: '50%', 
                                background: c, border: color === c ? '2px solid #fff' : 'none', 
                                cursor: 'pointer', transition: 'transform 0.2s'
                            }} 
                            className="color-swatch"
                        />
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase' }}>Permissions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {PERMISSIONS.map(perm => {
                        const isChecked = permissions.includes(perm.id);
                        return (
                            <div 
                                key={perm.id}
                                onClick={() => togglePermission(perm.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${isChecked ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                    borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isChecked ? '#fff' : 'rgba(255,255,255,0.6)' }}>{perm.name}</div>
                                    <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{perm.desc}</div>
                                </div>
                                <div style={{ 
                                    width: '18px', height: '18px', borderRadius: '4px', 
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: isChecked ? 'var(--accent)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {isChecked && <Check size={12} color="#000" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                    onClick={onCancel}
                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '900', cursor: 'pointer' }}
                >
                    CANCEL
                </button>
                <button 
                    onClick={() => onSave({ name, color, permissions })}
                    disabled={!name.trim()}
                    style={{ flex: 2, padding: '12px', background: 'var(--accent)', border: 'none', borderRadius: '12px', color: '#000', fontWeight: '900', cursor: 'pointer', opacity: name.trim() ? 1 : 0.5 }}
                >
                    {isNew ? 'CREATE ROLE' : 'SAVE CHANGES'}
                </button>
            </div>
        </div>
    );
};
