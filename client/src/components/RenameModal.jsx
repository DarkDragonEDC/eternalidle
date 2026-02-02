import React, { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';

const RenameModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');



    useEffect(() => {
        if (isOpen) {
            setNewName('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (newName.length < 3 || newName.length > 20) {
            setError('Name must be 3-20 characters long.');
            return;
        }
        if (!/^[a-zA-Z0-9_ ]+$/.test(newName)) {
            setError('Name can only contain letters, numbers, spaces, and underscores.');
            return;
        }
        onSubmit(newName);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2147483647, // Max Safe Integer for z-index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#111',
                border: '1px solid #333',
                borderRadius: '16px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
                <h3 style={{ color: '#fff', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                    <Edit size={20} color="#fbbf24" />
                    Change Character Name
                </h3>
                <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.5' }}>
                    Enter your new name below. This will consume your Name Change Token.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                padding: '12px',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                            placeholder="New Name..."
                            maxLength={20}
                            autoFocus
                        />
                        {error && <p style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '5px' }}>{error}</p>}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'linear-gradient(to right, #d4af37, #b4932a)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
                            }}
                        >
                            Confirm Change
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RenameModal;
