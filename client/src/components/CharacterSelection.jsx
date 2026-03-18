import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, LogOut, Info } from 'lucide-react';
import '../index.css';

import { formatNumber, formatSilver } from '@utils/format';
import ThemeSelector from './ThemeSelector';

import { useAppStore } from '../store/useAppStore';

const CharacterSelection = ({ onSelectCharacter, theme, setTheme, isMobile, onPreviewTheme }) => {
    const { characters, isCharactersLoading: loading, fetchCharacters, setCharacters, setActiveTab } = useAppStore();
    const [creating, setCreating] = useState(null); // 'normal' or 'ironman' or null
    const [newCharName, setNewCharName] = useState('');
    const [error, setError] = useState(null);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
    const [deletingCharacter, setDeletingCharacter] = useState(null); // stores the character object to be deleted
    const [showIronmanTooltip, setShowIronmanTooltip] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error logging out:', err);
            setError('Failed to log out');
        }
    };

    useEffect(() => {
        fetchCharacters(supabase);
    }, [fetchCharacters]);

    const handleCreate = async () => {
        if (!newCharName.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newCharName,
                    isIronman: creating === 'ironman'
                })
            });

            if (!res.ok) {
                let errorMessage = `Server error (${res.status})`;
                try {
                    const errData = await res.json();
                    if (errData.error) {
                        errorMessage = errData.error;
                    }
                } catch (parseErr) {
                    // Fallback to text if JSON fails
                    const textData = await res.text().catch(() => null);
                    if (textData) errorMessage = textData;
                }
                throw new Error(errorMessage);
            }

            const newChar = await res.json();
            setCharacters([...characters, newChar]);
            setCreating(null);
            setNewCharName('');
            setError(null);
            
            // Auto-select and redirect for new characters
            onSelectCharacter(newChar.id);
            setActiveTab('village');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async () => {
        if (!deletingCharacter) return;
        const requiredText = `Delete ${deletingCharacter.name}`;
        if (deleteConfirmationInput !== requiredText) return;

        const charId = deletingCharacter.id;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const res = await fetch(`${apiUrl}/api/characters/${charId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to delete character');
            }

            setCharacters(characters.filter(c => c.id !== charId));
            setDeletingCharacter(null);
            setDeleteConfirmationInput('');
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const getEquipmentIcons = (char) => {
        if (!char || !char.state || !char.state.equipment) return null;
        const equip = char.state.equipment;
        const icons = [];
        if (equip.mainHand) icons.push('⚔️');
        if (equip.chest) icons.push('🛡️');
        if (equip.tool_pickaxe || equip.tool_axe) icons.push('⛏️');
        return icons.join(' ');
    };

    if (loading) return <div className="loading-screen">Loading Characters...</div>;

    return (
        <div className="char-select-container">
            <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={20} />
                <span>Logout</span>
            </button>

            {/* Theme Selector removed as requested by user */}

            {/* Deletion Confirmation Modal */}
            {deletingCharacter && (
                <div className="modal-overlay" onClick={() => setDeletingCharacter(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Confirm Deletion</h2>
                        <p>To delete <strong>{deletingCharacter.name}</strong>, type <strong>Delete {deletingCharacter.name}</strong> in the field below:</p>
                        <input
                            type="text"
                            value={deleteConfirmationInput}
                            onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                            placeholder={`Delete ${deletingCharacter.name}`}
                            className="modal-input"
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button
                                className="confirm-delete-btn"
                                disabled={deleteConfirmationInput !== `Delete ${deletingCharacter.name}`}
                                onClick={handleDelete}
                            >
                                Delete Character
                            </button>
                            <button className="cancel-btn" onClick={() => setDeletingCharacter(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="char-select-title">Select Your Character</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="char-list">
                {(() => {
                    const normalChar = characters.find(c => !c.state?.isIronman);
                    const ironmanChar = characters.find(c => !!c.state?.isIronman);
                    const orphanedChar = (characters.length === 2 && (!normalChar || !ironmanChar))
                        ? characters.find(c => c.id !== (normalChar?.id || ironmanChar?.id))
                        : null;

                    return [0, 1].map(index => {
                        const isIronmanSlot = index === 1;
                        let char = isIronmanSlot ? ironmanChar : normalChar;

                        // Normalize state (Handle double nesting bug: state.state)
                        if (char && char.state && char.state.state) {
                            char = { ...char, state: char.state.state };
                        }


                        // If this slot is empty but we have an orphaned character, show it here?
                        // Or only show it if it's the only one left and its slot is "taken" (unlikely for 2 chars)
                        // Actually, if we have two of one mode, show the second one in the 'wrong' slot with a warning
                        if (!char && orphanedChar) {
                            char = orphanedChar;
                        }

                        return (
                            <div key={index} className="slot-container">
                                <div className="slot-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isIronmanSlot ? (
                                        <>
                                            IRONMAN MODE
                                            <div className="info-icon-container"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowIronmanTooltip(!showIronmanTooltip);
                                                }}
                                            >
                                                <Info size={14} style={{ cursor: 'help', opacity: 0.7 }} />
                                                <div className={`info-tooltip ${showIronmanTooltip ? 'show' : ''}`}>
                                                    <b>Solo Challenge Mode:</b><br />
                                                    No Trading, No Market access,<br />
                                                    and no player interaction.
                                                </div>
                                            </div>
                                        </>
                                    ) : 'NORMAL MODE'}
                                </div>

                                {char ? (
                                    <div className="char-card" onClick={() => onSelectCharacter(char.id)}>
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            {char.state?.isIronman && (
                                                <div className="ironman-badge">IRONMAN</div>
                                            )}
                                            {((isIronmanSlot && !char.state?.isIronman) || (!isIronmanSlot && char.state?.isIronman)) && (
                                                <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', background: '#ff4444', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', zIndex: 6, whiteSpace: 'nowrap' }}>
                                                    WRONG SLOT
                                                </div>
                                            )}
                                            
                                            {/* Avatar Portrait */}
                                            <div className="char-avatar-circle" style={{
                                                background: 'var(--slot-bg)',
                                                border: '2px solid var(--accent)',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                position: 'relative'
                                            }}>
                                                {(() => {
                                                    let avatarPath = char.avatar || char.state?.avatar;
                                                    if (!avatarPath && char.state?.state?.avatar) {
                                                        avatarPath = char.state.state.avatar;
                                                    }
                                                    
                                                    const cleanPath = avatarPath 
                                                        ? (avatarPath.startsWith('/profile/') ? avatarPath : `/profile/${avatarPath}`)
                                                        : '/profile/1 - male.webp';
                                                    const webpPath = cleanPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
                                                    
                                                    return <img 
                                                        src={webpPath} 
                                                        alt={char.name} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
                                                    />;
                                                })()}
                                            </div>

                                            <h3 className="char-name" style={{ margin: '5px 0' }}>{char.name}</h3>
                                            
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingCharacter(char);
                                                    setDeleteConfirmationInput('');
                                                }}
                                                title="Delete character"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={16} style={{ display: 'block' }} />
                                            </button>
                                        </div>
                                        <div className="char-info">
                                            <p>Total Level: {char.state && char.state.skills ? formatNumber(Object.values(char.state.skills).reduce((acc, s) => acc + (s.level || 0), 0)) : 0}</p>
                                            <p>Silver: {char.state ? formatNumber(char.state.silver || 0) : 0}</p>
                                            <p className="char-icons">{getEquipmentIcons(char)}</p>
                                        </div>
                                        <button className="play-btn">Play</button>
                                    </div>
                                ) : (
                                    <>
                                        {creating === (isIronmanSlot ? 'ironman' : 'normal') ? (
                                            <div className="char-card create-form version-marker-v2">
                                                <input
                                                    type="text"
                                                    placeholder="Character Name"
                                                    value={newCharName}
                                                    onChange={(e) => setNewCharName(e.target.value)}
                                                    maxLength={12}
                                                    autoFocus
                                                />
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    margin: '10px 0',
                                                    textAlign: 'left',
                                                    fontSize: '0.75rem',
                                                    color: '#94a3b8',
                                                    lineHeight: '1.4',
                                                    cursor: 'pointer'
                                                }} onClick={() => setTermsAccepted(!termsAccepted)}>
                                                    <input
                                                        type="checkbox"
                                                        checked={termsAccepted}
                                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                                                    />
                                                    <span>I agree with the terms and guarantee this will be my only account.</span>
                                                </div>
                                                <div className="create-actions">
                                                    <button
                                                        onClick={handleCreate}
                                                        disabled={!newCharName.trim() || !termsAccepted}
                                                        style={{ opacity: (!newCharName.trim() || !termsAccepted) ? 0.5 : 1 }}
                                                    >
                                                        Create
                                                    </button>
                                                    <button className="cancel" onClick={() => {
                                                        setCreating(null);
                                                        setTermsAccepted(false);
                                                    }}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            !char && (
                                                <div className="char-card new-char" onClick={() => setCreating(isIronmanSlot ? 'ironman' : 'normal')}>
                                                    <div className="plus-icon">+</div>
                                                    <p>New Character</p>
                                                    {isIronmanSlot && (
                                                        <p style={{ fontSize: '0.65rem', color: '#ff5252', marginTop: '-5px', fontWeight: 'bold' }}>Solo Mode Only</p>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    });
                })()}
            </div>
            <style>{`
                .char-select-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    background: transparent;
                    color: var(--text-main);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .char-select-container .char-select-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--accent);
                    text-align: center;
                    margin-bottom: 10px;
                    letter-spacing: 2px;
                }
                .char-list {
                    display: flex;
                    gap: 30px;
                    margin-top: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                    max-width: 100%;
                }
                .slot-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                }
                .char-avatar-circle {
                    width: 100px;
                    height: 100px;
                    margin: 10px auto;
                }
                .slot-title {
                    font-size: 0.75rem;
                    font-weight: 900;
                    letter-spacing: 2px;
                    color: var(--text-dim);
                    text-transform: uppercase;
                    padding: 4px 12px;
                    background: var(--accent-soft);
                    border-radius: 4px;
                    border: 1px solid var(--border);
                }
                .info-icon-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .info-tooltip {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    bottom: 125%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--panel-bg);
                    color: var(--text-main);
                    text-align: center;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid var(--accent);
                    font-size: 0.65rem;
                    line-height: 1.4;
                    white-space: nowrap;
                    z-index: 100;
                    box-shadow: var(--panel-shadow);
                    text-transform: none;
                    letter-spacing: normal;
                    font-weight: normal;
                    transition: opacity 0.2s, visibility 0.2s;
                }
                .info-tooltip::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: var(--accent) transparent transparent transparent;
                }
                .info-icon-container:hover .info-tooltip,
                .info-tooltip.show {
                    visibility: visible;
                    opacity: 1;
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(8px);
                }
                .modal-content {
                    background: var(--panel-bg);
                    border: 2px solid var(--accent);
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: var(--panel-shadow);
                }
                .modal-content h2 {
                    color: var(--accent);
                    margin-bottom: 15px;
                    font-size: 1.5rem;
                }
                .modal-content p {
                    color: var(--text-dim);
                    margin-bottom: 20px;
                    line-height: 1.5;
                }
                .modal-input {
                    width: 100%;
                    padding: 12px;
                    background: var(--slot-bg);
                    border: 1px solid var(--border);
                    border-radius: 6px;
                    color: var(--text-main);
                    margin-bottom: 20px;
                    outline: none;
                    font-family: inherit;
                }
                .modal-input:focus {
                    border-color: var(--accent);
                }
                .modal-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                }
                .confirm-delete-btn {
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .confirm-delete-btn:disabled {
                    background: var(--border);
                    color: var(--text-dim);
                    cursor: not-allowed;
                }
                .confirm-delete-btn:not(:disabled):hover {
                    background: #dc2626;
                }
                .cancel-btn {
                    background: transparent;
                    color: var(--text-dim);
                    border: 1px solid var(--border);
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .cancel-btn:hover {
                    background: var(--accent-soft);
                    color: var(--text-main);
                }

                .char-card {
                    background: var(--panel-bg);
                    border: 2px solid var(--border);
                    padding: 20px;
                    width: 200px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: transform 0.2s, border-color 0.2s;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .char-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--accent);
                    box-shadow: var(--panel-shadow);
                }
                .char-name {
                    color: var(--accent);
                    margin: 15px 0 10px 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                .char-info p {
                    font-size: 0.85rem;
                    color: var(--text-dim);
                    margin: 5px 0;
                }
                
                @media (max-width: 768px) {
                    .char-select-container {
                        justify-content: flex-start;
                        padding: 10px 15px;
                        min-height: 100dvh;
                    }
                    .char-select-container .char-select-title {
                        font-size: 1.1rem;
                        margin-bottom: 4px;
                    }
                    .char-list {
                        gap: 10px;
                        margin-top: 4px;
                    }
                    .slot-container {
                        gap: 4px;
                    }
                    .slot-title {
                        font-size: 0.65rem;
                        padding: 2px 10px;
                    }
                    .char-card {
                        width: 85vw;
                        max-width: 280px;
                        padding: 10px;
                    }
                    .char-avatar-circle {
                        width: 65px;
                        height: 65px;
                        margin: 4px auto;
                    }
                    .char-name {
                        font-size: 0.95rem;
                        margin: 2px 0 !important;
                    }
                    .char-info p {
                        font-size: 0.75rem;
                        margin: 2px 0;
                    }
                    .play-btn {
                        margin-top: 6px;
                        padding: 6px;
                    }
                    .ironman-badge {
                        top: -10px;
                        font-size: 0.55rem;
                        padding: 1px 8px;
                    }
                }
                .char-icons {
                    font-size: 1.2em;
                    margin-top: 5px;
                }
                .play-btn {
                    margin-top: 15px;
                    background: var(--accent);
                    color: var(--bg-dark);
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: 700;
                    border-radius: 4px;
                }
                .play-btn:hover { opacity: 0.9; }
                
                .delete-btn {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    alignItems: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                    z-index: 10;
                }
                .delete-btn:hover {
                    background: #dc2626;
                    transform: scale(1.1);
                }
                .delete-btn.confirming {
                    background: #dc2626;
                    width: 32px;
                    height: 32px;
                    font-weight: bold;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }

                .logout-btn {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(211, 47, 47, 0.1);
                    border: 1px solid rgba(211, 47, 47, 0.3);
                    color: #ff5252;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .logout-btn:hover {
                    background: rgba(211, 47, 47, 0.2);
                    border-color: #ff5252;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2);
                }
                @media (max-width: 768px) {
                    .logout-btn {
                        position: static;
                        align-self: flex-end;
                        margin-top: 10px;
                    }
                }

                .new-char {
                    border-style: dashed;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-dim);
                    border-color: var(--border);
                }
                .plus-icon {
                    font-size: 3em;
                    margin-bottom: 10px;
                }

                .create-form input {
                    width: 90%;
                    padding: 8px;
                    margin-bottom: 10px;
                    background: var(--slot-bg);
                    border: 1px solid var(--border);
                    color: var(--text-main);
                    font-family: inherit;
                }
                .create-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-top: 5px;
                }
                .create-actions button {
                    padding: 10px 20px;
                    cursor: pointer;
                    font-family: inherit;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .create-actions button:first-child {
                    background: var(--accent);
                    color: var(--bg-dark);
                    box-shadow: var(--accent-soft);
                }
                .create-actions button:first-child:hover {
                    transform: translateY(-2px);
                }
                .create-actions button.cancel {
                    background: rgba(211, 47, 47, 0.2);
                    color: #ff5252;
                    border: 1px solid rgba(211, 47, 47, 0.4);
                }
                .create-actions button.cancel:hover {
                    background: rgba(211, 47, 47, 0.3);
                }
                .error-message {
                    color: #ff6b6b;
                    margin-bottom: 20px;
                }
                .ironman-badge {
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #718096 0%, #2d3748 100%);
                    color: white;
                    padding: 2px 10px;
                    border-radius: 10px;
                    font-size: 0.65rem;
                    font-weight: 900;
                    letter-spacing: 1px;
                    border: 1px solid #4a5568;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    white-space: nowrap;
                    z-index: 5;
                }
            `}</style>
        </div >
    );
};

export default CharacterSelection;
