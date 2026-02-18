import React, { useState, useEffect, useRef } from 'react';
import { Gift, X, Loader, Star, Zap } from 'lucide-react';
import { resolveItem, formatItemId } from '@shared/items'; // Ensure correct path

// Matches Server LOOT_TABLE
const SEGMENTS = [
    { id: 'T3_POTION_SILVER', label: 'Silver Potion', color: '#a0aec0', icon: '🧪' }, // Common
    { id: 'T3_POTION_XP', label: 'XP Potion', color: '#9f7aea', icon: '✨' }, // Common
    { id: 'T1_RUNE_SHARD', label: '500 Shards', color: '#a0aec0', icon: '💎' }, // Uncommon
    { id: 'T5_FOOD', label: '100 Cooked Food', color: '#48bb78', icon: '🍖' }, // Uncommon
    { id: 'ORBS_25', label: '25 Orbs', color: '#ecc94b', icon: '🔮' }, // Rare
    { id: 'T1_BATTLE_RUNE_SHARD', label: '50 Combat Shards', color: '#f56565', icon: '⚔️' }, // Legendary
    { id: 'ORBS_100', label: '100 Orbs!', color: '#d69e2e', icon: '🔮' }, // Legendary
    { id: 'MEMBERSHIP', label: 'Membership', color: '#805ad5', icon: '🎖️' }  // Legendary
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const DailySpinModal = ({ isOpen, onClose, socket }) => {
    const [spinning, setSpinning] = useState(false);
    const [reward, setReward] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const wheelRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setShowRewardModal(false);
            setReward(null);
            setSpinning(false);
            setRotation(0);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!socket) return;

        const handleResult = (data) => {
            // data.rewardIndex tells us where to stop
            // Wheel stops at top (0 deg).
            // If index 0 is at 0-45 deg (or centered), we calculate target.
            // Let's assume index 0 is at Top.
            // To land on index I, we need to rotate:
            // Total Rotation = (Min Spins * 360) + (360 - (I * SegmentAngle))

            // Adding fuzziness to center the landing
            const index = data.rewardIndex !== undefined ? data.rewardIndex : 0;
            const spins = 5; // Minimum full spins
            const baseAngle = 360 * spins;

            // Calculate rotation to bring segment CENTER to top (pointer at 0 deg)
            // Segments are rendered starting at index 0 at top (0 deg), going clockwise
            // Segment 0: 0-45 deg (center at 22.5)
            // Segment 1: 45-90 deg (center at 67.5)
            // etc.
            // To bring segment center to top, we need to SUBTRACT its angle
            const segmentCenterAngle = index * SEGMENT_ANGLE + (SEGMENT_ANGLE / 2);

            // We rotate BACKWARDS (negative) to bring the segment to top
            // But Convert to positive rotation for CSS
            const stopAngle = -segmentCenterAngle;

            // Add randomness within segment (+/- 15 degrees)
            const fuzz = Math.floor(Math.random() * 30) - 15;

            // Final rotation = base spins - segment angle + fuzz
            // Convert negative to positive by adding 360
            const finalRotation = baseAngle + stopAngle + fuzz;

            setRotation(finalRotation);

            // Wait for animation (4s) + Pause to celebrate (1.5s)
            setTimeout(() => {
                setSpinning(false);
                setReward(data.reward);
                setShowRewardModal(true);
            }, 5500); // 4s spin + 1.5s delay
        };

        socket.on('daily_spin_result', handleResult);

        return () => {
            socket.off('daily_spin_result', handleResult);
        };
    }, [socket]);

    const handleSpin = () => {
        if (spinning || reward) return;
        setSpinning(true);
        socket.emit('spin_daily');
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.9)', zIndex: 11000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(5px)'
        }}>
            {/* MAIN WHEEL CONTAINER */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* POINTER */}
                <div style={{
                    position: 'absolute',
                    top: '-20px',
                    zIndex: 10,
                    width: '0',
                    height: '0',
                    borderLeft: '20px solid transparent',
                    borderRight: '20px solid transparent',
                    borderTop: '40px solid #fff',
                    filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))'
                }}></div>

                {/* WHEEL */}
                <div
                    ref={wheelRef}
                    style={{
                        width: '350px',
                        height: '350px',
                        borderRadius: '50%',
                        border: '8px solid #ffd700',
                        boxShadow: '0 0 50px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(0,0,0,0.5)',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)',
                        transform: `rotate(${rotation}deg)`,
                        background: '#1a1f2e'
                    }}
                >
                    {/* Layer 1: Colored Segments */}
                    {SEGMENTS.map((seg, i) => (
                        <div
                            key={`bg-${i}`}
                            style={{
                                position: 'absolute',
                                top: '0',
                                left: '50%',
                                width: '50%',
                                height: '50%',
                                transformOrigin: '0% 100%',
                                transform: `rotate(${i * SEGMENT_ANGLE}deg) skewY(-${90 - SEGMENT_ANGLE}deg)`,
                                background: seg.color,
                                border: '1px solid rgba(0,0,0,0.2)',
                            }}
                        />
                    ))}

                    {/* Layer 2: Content/Labels (No Skew Distortion) */}
                    {SEGMENTS.map((seg, i) => (
                        <div
                            key={`label-${i}`}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                pointerEvents: 'none',
                                // Center of segment angle
                                transform: `rotate(${i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}deg) translate(0, -135px) rotate(0deg)`,
                                width: '100px',
                                height: '60px',
                                marginLeft: '-50px', // Center horizontally relative to transform point
                                marginTop: '-30px', // Center vertically
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                zIndex: 2
                            }}
                        >
                            <div style={{
                                fontSize: '1.8rem',
                                filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))',
                                marginBottom: '4px'
                            }}>
                                {seg.icon}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '900',
                                color: '#fff',
                                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)',
                                lineHeight: '1',
                                background: 'rgba(0,0,0,0.3)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                            }}>
                                {seg.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* SPIN BUTTON */}
                <button
                    onClick={handleSpin}
                    disabled={spinning || reward}
                    style={{
                        marginTop: '40px',
                        padding: '15px 50px',
                        fontSize: '1.5rem',
                        fontWeight: '900',
                        background: spinning ? '#555' : 'linear-gradient(to bottom, #ffd700, #b8860b)',
                        color: spinning ? '#aaa' : '#000',
                        border: '2px solid #fff',
                        borderRadius: '50px',
                        cursor: spinning ? 'not-allowed' : 'pointer',
                        boxShadow: spinning ? 'none' : '0 0 20px rgba(255, 215, 0, 0.6), inset 0 2px 0 rgba(255,255,255,0.5)',
                        transition: '0.2s',
                        transform: spinning ? 'scale(0.95)' : 'scale(1)'
                    }}
                >
                    {spinning ? 'GOOD LUCK!' : 'SPIN!'}
                </button>

                {/* CLOSE BUTTON */}
                {!spinning && (
                    <button
                        onClick={onClose}
                        style={{
                            marginTop: '20px',
                            background: 'transparent',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: '#aaa',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                )}
            </div>

            {/* REWARD MODAL POPUP */}
            {showRewardModal && reward && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20
                }}>
                    <div style={{
                        background: '#1a1f2e',
                        padding: '30px',
                        borderRadius: '20px',
                        border: '2px solid #ffd700',
                        textAlign: 'center',
                        boxShadow: '0 0 50px rgba(255, 215, 0, 0.4)',
                        animation: 'popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        width: 'min(400px, 90vw)',
                        maxWidth: '90%'
                    }}>
                        <h2 style={{
                            color: '#ffd700',
                            fontSize: 'clamp(1.5rem, 6vw, 2rem)', // Responsive font
                            marginBottom: '10px',
                            wordBreak: 'break-word' // Safety wrap
                        }}>CONGRATULATIONS!</h2>
                        <div style={{ fontSize: '4rem', margin: '20px 0' }}>🎁</div>
                        <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '30px' }}>
                            You won <strong style={{ color: '#4ade80' }}>{reward.qty}x {formatItemId(reward.id)}</strong>!
                        </p>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '12px 30px',
                                background: '#4ade80',
                                color: '#005f20',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 0 #2f855a'
                            }}
                        >
                            CLAIM REWARD
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default DailySpinModal;
