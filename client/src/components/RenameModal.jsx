import React, { useState, useEffect, useCallback } from 'react';
import { Edit, Check, X, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const RenameModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const { nameAvailability, checkNameAvailability, setNameAvailability } = useAppStore();

    useEffect(() => {
        if (isOpen) {
            setNewName('');
            setError('');
            setNameAvailability(null);
            setIsChecking(false);
        }
    }, [isOpen]);

    // Validation logic
    const validateName = (name) => {
        if (name.length > 0 && name.length < 3) return 'Name too short';
        if (name.length > 20) return 'Name too long (max 20)';
        if (name.length > 0 && !/^[a-zA-Z0-9_ ]+$/.test(name)) {
            return 'Only letters, numbers, spaces, and underscores';
        }
        return '';
    };

    // Auto-check availability with debounce
    useEffect(() => {
        if (!isOpen) return;
        
        const trimmedName = newName.trim();
        const validationError = validateName(trimmedName);
        
        setError(validationError);
        setNameAvailability(null);

        if (trimmedName.length >= 3 && !validationError) {
            setIsChecking(true);
            const timeoutId = setTimeout(() => {
                checkNameAvailability(trimmedName);
            }, 600);
            return () => {
                clearTimeout(timeoutId);
                setIsChecking(false);
            };
        }
    }, [newName, isOpen]);

    // Update checking status when result arrives
    useEffect(() => {
        if (nameAvailability) {
            setIsChecking(false);
        }
    }, [nameAvailability]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = newName.trim();
        const validationError = validateName(trimmedName);
        
        if (validationError) {
            setError(validationError);
            return;
        }

        if (nameAvailability && !nameAvailability.available) {
            setError('This name is already taken.');
            return;
        }

        if (!nameAvailability && trimmedName.length >= 3) {
            // Wait for check or force one? Usually debounce handles this, but for robustness:
            return;
        }

        onSubmit(trimmedName);
    };

    if (!isOpen) return null;

    const isAvailable = nameAvailability && nameAvailability.available && nameAvailability.name === newName.trim();
    const isTaken = nameAvailability && !nameAvailability.available && nameAvailability.name === newName.trim();

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2147483647,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '32px',
                width: '90%',
                maxWidth: '420px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decoration */}
                <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '150px', height: '150px', background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)', opacity: 0.3, zIndex: 0 }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h3 style={{ color: 'var(--text-main)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem', fontWeight: '900' }}>
                        <div style={{ padding: '8px', background: 'var(--accent-soft)', borderRadius: '12px' }}>
                            <Edit size={24} color="var(--accent)" />
                        </div>
                        Rename Character
                    </h3>
                    
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.6' }}>
                        Choose a legendary name for your hero. This action will consume your <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Name Change Token</span>.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px', position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                New Character Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--slot-bg)',
                                        border: `1px solid ${isTaken ? '#ff4d4d' : isAvailable ? '#4ade80' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        paddingRight: '45px',
                                        color: 'var(--text-main)',
                                        fontSize: '1.1rem',
                                        outline: 'none',
                                        transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        boxShadow: isAvailable ? '0 0 15px rgba(74, 222, 128, 0.1)' : 'none'
                                    }}
                                    placeholder="Enter new name..."
                                    maxLength={20}
                                    autoFocus
                                    disabled={isSubmitting}
                                />
                                
                                <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                    {isChecking && <Loader2 size={20} className="animate-spin" color="var(--text-dim)" />}
                                    {!isChecking && isAvailable && <Check size={20} color="#4ade80" />}
                                    {!isChecking && isTaken && <X size={20} color="#ff4d4d" />}
                                </div>
                            </div>
                            
                            {error && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={12} /> {error}
                            </p>}
                            {isAvailable && <p style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} /> This name is available!
                            </p>}
                            {isTaken && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '8px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={12} /> This name is already taken.
                            </p>}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: '0.2s'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !isAvailable || isChecking}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    background: isAvailable ? 'var(--accent)' : 'var(--accent-dim)',
                                    opacity: isAvailable ? 1 : 0.6,
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: 'var(--panel-bg)',
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    fontWeight: '900',
                                    letterSpacing: '0.5px',
                                    boxShadow: isAvailable ? '0 8px 20px var(--accent-soft)' : 'none',
                                    transition: '0.3s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Changing...
                                    </>
                                ) : (
                                    'Confirm Change'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;
