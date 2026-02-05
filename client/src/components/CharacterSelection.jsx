import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, LogOut } from 'lucide-react';
import '../index.css';

import { formatNumber, formatSilver } from '@utils/format';

const CharacterSelection = ({ onSelectCharacter }) => {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newCharName, setNewCharName] = useState('');
    const [error, setError] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // stores char.id if confirming

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error logging out:', err);
            setError('Failed to log out');
        }
    };

    useEffect(() => {
        fetchCharacters();
    }, []);

    const fetchCharacters = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await fetch(`${apiUrl}/api/characters`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to fetch characters');
            }

            const data = await res.json();
            setCharacters(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
            
            // If it's an auth error, the session might be stale or from another project
            if (err.message.includes('Invalid token') || err.message.includes('JWT')) {
                console.warn('Authentication error detected. Clearing session...');
                supabase.auth.signOut().then(() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCharName.trim()) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL;
            const res = await fetch(`${apiUrl}/api/characters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCharName })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create character');
            }

            const newChar = await res.json();
            setCharacters([...characters, newChar]);
            setCreating(false);
            setNewCharName('');
            setError(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (e, charId) => {
        e.stopPropagation();
        if (confirmDelete !== charId) {
            setConfirmDelete(charId);
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const apiUrl = import.meta.env.VITE_API_URL;
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
            setConfirmDelete(null);
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

            <h1>Select Your Character</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="char-list">
                {characters.map(char => (
                    <div key={char.id} className="char-card" onClick={() => onSelectCharacter(char.id)}>
                        <div style={{ position: 'relative' }}>
                            <h3 className="char-name">{char.name}</h3>
                            <button
                                className={`delete-btn ${confirmDelete === char.id ? 'confirming' : ''}`}
                                onClick={(e) => handleDelete(e, char.id)}
                                title={confirmDelete === char.id ? "Click again to confirm" : "Delete character"}
                            >
                                {confirmDelete === char.id ? '?' : <Trash2 size={16} />}
                            </button>
                        </div>
                        <div className="char-info">
                            <p>Total Level: {char.state && char.state.skills ? formatNumber(Object.values(char.state.skills).reduce((acc, s) => acc + (s.level || 0), 0)) : 0}</p>
                            <p>Silver: {char.state ? formatNumber(char.state.silver || 0) : 0}</p>
                            <p className="char-icons">{getEquipmentIcons(char)}</p>
                        </div>
                        <button className="play-btn">Play</button>
                    </div>
                ))}

                {characters.length < 2 && !creating && (
                    <div className="char-card new-char" onClick={() => setCreating(true)}>
                        <div className="plus-icon">+</div>
                        <p>New Character</p>
                    </div>
                )}

                {creating && (
                    <div className="char-card create-form">
                        <input
                            type="text"
                            placeholder="Character Name"
                            value={newCharName}
                            onChange={(e) => setNewCharName(e.target.value)}
                            maxLength={12}
                        />
                        <div className="create-actions">
                            <button onClick={handleCreate}>Create</button>
                            <button className="cancel" onClick={() => setCreating(false)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .char-select-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                    background: #12151e;
                    color: #e2e8f0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .char-select-container h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #d4af37;
                    text-align: center;
                    margin-bottom: 10px;
                }
                .char-list {
                    display: flex;
                    gap: 20px;
                    margin-top: 20px;
                    flex-wrap: wrap;
                    justify-content: center;
                    max-width: 100%;
                }
                .char-card {
                    background: #1a1f2e;
                    border: 2px solid #2d3748;
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
                    border-color: #d4af37;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                }
                .char-name {
                    color: #d4af37;
                    margin-bottom: 10px;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                .char-info p {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    margin: 5px 0;
                }
                
                @media (max-width: 480px) {
                    .char-select-container h1 {
                        font-size: 1.25rem;
                    }
                    .char-card {
                        width: 85vw;
                        max-width: 280px;
                    }
                    .char-name {
                        font-size: 1rem;
                    }
                    .char-info p {
                        font-size: 0.8rem;
                    }
                }
                .char-icons {
                    font-size: 1.2em;
                    margin-top: 5px;
                }
                .play-btn {
                    margin-top: 15px;
                    background: #d4af37;
                    color: #12151e;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: 700;
                    border-radius: 4px;
                }
                .play-btn:hover { background: #b8960b; }
                
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
                    align-items: center;
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

                .new-char {
                    border-style: dashed;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #888;
                }
                .plus-icon {
                    font-size: 3em;
                    margin-bottom: 10px;
                }

                .create-form input {
                    width: 90%;
                    padding: 8px;
                    margin-bottom: 10px;
                    background: #111;
                    border: 1px solid #555;
                    color: white;
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
                    background: linear-gradient(135deg, #d4af37 0%, #b8960b 100%);
                    color: #000;
                    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
                }
                .create-actions button:first-child:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
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
            `}</style>
        </div>
    );
};

export default CharacterSelection;
