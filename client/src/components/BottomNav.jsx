import React from 'react';
import { Home, User, Package, Zap, Castle, Map, Skull, Trophy, ShoppingBag } from 'lucide-react';

const BottomNav = ({ activeTab, setActiveTab, onNavigate }) => {
    const navItems = [
        { id: 'profile', label: 'Profile', icon: <User size={20} /> }, // Using Profile as Home/Dashboard
        { id: 'inventory', label: 'Inventory', icon: <Package size={20} /> },
        { id: 'skills', label: 'Skills', icon: <Zap size={20} /> }, // New specialized tab
        { id: 'town', label: 'Town', icon: <Castle size={20} /> },   // Market, Shop, Ranking
        { id: 'combat', label: 'Combat', icon: <Map size={20} /> }, // Combat/Dungeons
    ];

    // Helper to map complex states to the simple bottom nav
    const getActiveNav = () => {
        if (['gathering', 'refining', 'crafting'].includes(activeTab)) return 'skills';
        if (['market', 'ranking'].includes(activeTab)) return 'town';
        if (['combat', 'dungeon'].includes(activeTab)) return 'combat';
        if (activeTab === 'profile') return 'profile';
        if (activeTab === 'inventory') return 'inventory';
        return activeTab;
    };

    const currentNav = getActiveNav();

    const handleNavClick = (id) => {
        if (id === 'skills') {
            setActiveTab('skills_overview');
        } else if (id === 'town') {
            setActiveTab('town_overview');
        } else if (id === 'combat') {
            setActiveTab('combat_overview');
        } else {
            setActiveTab(id);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            background: '#1a1f2e', // Dark theme consistent with user image
            borderTop: '1px solid #2d3748',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '10px 5px',
            zIndex: 1000,
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            {navItems.map(item => {
                const isActive = currentNav === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            color: isActive ? '#d4af37' : '#718096', // Gold accent
                            cursor: 'pointer',
                            flex: 1,
                            position: 'relative'
                        }}
                    >
                        {item.icon}
                        <span style={{ fontSize: '0.7rem', fontWeight: isActive ? '700' : '500' }}>{item.label}</span>
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                top: '-11px',
                                width: '40%',
                                height: '2px',
                                background: '#d4af37',
                                borderRadius: '0 0 4px 4px'
                            }} />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default BottomNav;
