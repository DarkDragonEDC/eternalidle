import React, { useState, useEffect } from 'react';
import { Star, Coins, Clover, Diamond, Hammer, Sprout, Wand2, ArrowUpCircle } from 'lucide-react';

const BuffsDisplay = ({ activeBuffs }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (!activeBuffs || Object.keys(activeBuffs).length === 0) return null;

    const getBuffInfo = (type) => {
        switch (type) {
            case 'GLOBAL_XP': return { icon: <Star size={16} color="var(--accent)" />, label: 'Global XP' };
            case 'GATHER_XP': return { icon: <Sprout size={16} color="#4caf50" />, label: 'Gather XP' };
            case 'CRAFT_XP': return { icon: <Hammer size={16} color="#ff9800" />, label: 'Craft XP' };
            case 'REFINE_XP': return { icon: <ArrowUpCircle size={16} color="#2196f3" />, label: 'Refine XP' };
            case 'GOLD': return { icon: <Coins size={16} color="var(--accent)" />, label: 'Gold Gain' };
            case 'DROP': return { icon: <Clover size={16} color="#4caf50" />, label: 'Drop Rate' };
            case 'QUALITY': return { icon: <Diamond size={16} color="#00bcd4" />, label: 'Quality' };
            default: return { icon: <Wand2 size={16} color="#fff" />, label: type };
        }
    };

    const formatTime = (ms) => {
        if (ms <= 0) return '00:00:00';
        const totalSecs = Math.floor(ms / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;

        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const sStr = s.toString().padStart(2, '0');

        return `${hStr}:${mStr}:${sStr}`;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'absolute',
            top: '10px', // Inside Main
            right: '10px',
            zIndex: 100,
            pointerEvents: 'none' // Click through
        }}>
            {Object.entries(activeBuffs).map(([type, buff]) => {
                if (buff.expiresAt <= now) return null;

                const { icon, label } = getBuffInfo(type);
                const remaining = buff.expiresAt - now;
                const valuePercent = Math.round(buff.value * 100);

                return (
                    <div key={type} style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeIn 0.3s ease',
                        width: 'fit-content',
                        alignSelf: 'flex-end',
                        pointerEvents: 'auto' // Re-enable clicks for tooltip if needed
                    }} title={`${label}: +${valuePercent}%`}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {icon}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#fff' }}>
                                {label} <span style={{ color: '#aaa' }}>+{valuePercent}%</span>
                            </span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                                {formatTime(remaining)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default BuffsDisplay;
