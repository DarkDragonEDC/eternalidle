import React from 'react';
import { motion, Reorder } from 'framer-motion';
import { Shield, Edit2, Trash2, Plus, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

export const GuildRoles = ({ 
    roles, 
    onEditRole, 
    onCreateRole, 
    onDeleteRole, 
    onReorderRoles,
    playerHasPermission,
    isMobile 
}) => {
    // Sort roles by order field
    const sortedRoles = [...roles].sort((a, b) => (a.order || 0) - (b.order || 0));

    const handleMove = (index, direction) => {
        const sortedArray = [...sortedRoles];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sortedArray.length) return;
        
        // Swap elements in the sorted array
        [sortedArray[index], sortedArray[targetIndex]] = [sortedArray[targetIndex], sortedArray[index]];
        
        // Re-calculate orders for all roles based on new positions
        const rolesObject = {};
        sortedArray.forEach((role, i) => {
            const { id, ...data } = role;
            rolesObject[id] = { ...data, order: i };
        });

        onReorderRoles(rolesObject);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--accent)', letterSpacing: '1px' }}>GUILD HIERARCHY</div>
                {playerHasPermission('manage_roles') && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onCreateRole}
                        style={{
                            padding: '6px 12px', background: 'var(--accent)', border: 'none',
                            borderRadius: '8px', color: '#000', fontSize: '0.7rem', fontWeight: '900',
                            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'
                        }}
                    >
                        <Plus size={14} /> NEW ROLE
                    </motion.button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedRoles.map((role, idx) => {
                    const isSystemRole = ['LEADER', 'OFFICER', 'MEMBER'].includes(role.id);
                    const isLeader = role.id === 'LEADER';
                    return (
                        <motion.div
                            key={role.id}
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '12px 15px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {playerHasPermission('manage_roles') && !isLeader && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'rgba(255,255,255,0.2)' }}>
                                        <ChevronUp 
                                            size={16} 
                                            style={{ 
                                                cursor: idx > 1 ? 'pointer' : 'not-allowed', 
                                                opacity: idx > 1 ? 1 : 0.3 
                                            }} 
                                            onClick={() => idx > 1 && handleMove(idx, -1)} 
                                        />
                                        <ChevronDown 
                                            size={16} 
                                            style={{ cursor: idx < sortedRoles.length - 1 ? 'pointer' : 'not-allowed', opacity: idx < sortedRoles.length - 1 ? 1 : 0.3 }} 
                                            onClick={() => idx < sortedRoles.length - 1 && handleMove(idx, 1)} 
                                        />
                                    </div>
                                )}
                                <div style={{
                                    width: '32px', height: '32px', background: 'rgba(0,0,0,0.3)', 
                                    borderRadius: '8px', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', border: `1px solid ${role.color || 'rgba(255,255,255,0.1)'}`
                                }}>
                                    <Shield size={16} color={role.color || '#fff'} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {role.name}
                                        {isSystemRole && <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'rgba(255,255,255,0.4)' }}>SYSTEM</span>}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                        {role.permissions?.length || 0} permissions
                                    </div>
                                </div>
                            </div>

                            {playerHasPermission('manage_roles') && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => onEditRole(role)}
                                        style={{ padding: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    {!isSystemRole && (
                                        <button
                                            onClick={() => onDeleteRole(role.id)}
                                            style={{ padding: '6px', background: 'rgba(255,68,68,0.05)', border: 'none', borderRadius: '6px', color: '#ff4444', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
            
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px' }}>
                System roles (Owner, Officer, Member) cannot be deleted or reordered beyond their priority level.
            </div>
        </div>
    );
};
