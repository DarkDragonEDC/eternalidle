import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, Sword, Shield, Zap, TrendingUp, 
  Lock, Layers, Clock, Star 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ITEMS, resolveItem, formatItemId } from '@shared/items';
import { mapTabCategoryToSkill } from '../utils/SkillUtils';
import { getLevelRequirement } from '@shared/items';
import SkillProgressHeader from '../components/SkillProgressHeader';
import ActivityProgressBar from '../components/ActivityProgressBar';
import { isLocked, getSafeAmount } from '../utils/gameUtils';

const CraftingPage = () => {
  const {
    activeTab,
    activeCategory,
    activeTier,
    setActiveTier,
    gameState,
    setModalItem,
    setModalType,
    isMobile
  } = useAppStore();

  const craftingItems = ITEMS.GEAR[activeCategory] || {};
  const allItemsInCategory = [];
  Object.values(craftingItems).forEach(itemTypeGroup => {
    Object.values(itemTypeGroup).forEach(item => {
      allItemsInCategory.push(item);
    });
  });

  const itemsToRender = allItemsInCategory.filter(i => i.tier === activeTier);

  if (!craftingItems || Object.keys(craftingItems).length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SkillProgressHeader tab={activeTab} category={activeCategory} />
        <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'var(--panel-bg)' }}>
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⚗️</div>
            <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
            <p style={{ color: 'var(--text-dim)' }}>Alchemy Lab under construction.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SkillProgressHeader tab={activeTab} category={activeCategory} />
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', background: 'var(--panel-bg)' }}>
        <div style={{ padding: isMobile ? '20px' : '30px 40px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>
            {activeCategory.replace(/_/g, ' ')} CRAFTING
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '15px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(t => (
              <button key={t} onClick={() => setActiveTier(t)} style={{ padding: '6px', background: activeTier === t ? 'var(--accent-soft)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeTier === t ? 'var(--border-active)' : 'rgba(255,255,255,0.05)', borderRadius: '4px', color: activeTier === t ? 'var(--accent)' : '#555', fontSize: '0.65rem', fontWeight: '900' }}>T{t}</button>
            ))}
          </div>
        </div>
        <div className="scroll-container" style={{ padding: isMobile ? '20px' : '30px 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {itemsToRender.map(item => {
              const resolved = resolveItem(item.id) || item;
              const reqs = resolved.req || item.req || {};
              const stats = resolved.stats || item.stats || {};

              const statsList = [];
              if (resolved.heal) statsList.push({ icon: <Heart size={12} />, val: `${resolved.heal} Heal`, color: '#4caf50' });
              if (stats.damage) statsList.push({ icon: <Sword size={12} />, val: `${stats.damage} Dmg`, color: '#ff4444' });
              if (stats.defense) statsList.push({ icon: <Shield size={12} />, val: `${stats.defense} Def`, color: '#4caf50' });
              if (stats.hp) statsList.push({ icon: <Heart size={12} />, val: `${stats.hp} HP`, color: '#ff4d4d' });
              if (stats.speed) statsList.push({ icon: <Zap size={12} />, val: `${stats.speed}% Spd`, color: 'var(--accent)' });
              if (stats.attackSpeed) statsList.push({ icon: <Zap size={12} />, val: `${(1000 / stats.attackSpeed).toFixed(2)}/s`, color: 'var(--accent)' });
              if (stats.efficiency) {
                if (typeof stats.efficiency === 'number') {
                  statsList.push({ icon: <TrendingUp size={12} />, val: `${stats.efficiency}% Eff`, color: '#90d5ff' });
                } else if (typeof stats.efficiency === 'object' && stats.efficiency.GLOBAL) {
                  statsList.push({ icon: <TrendingUp size={12} />, val: `${stats.efficiency.GLOBAL}% Global`, color: '#90d5ff' });
                }
              }

              const type = activeTab.toUpperCase();
              const locked = isLocked(type, item, gameState);
              const isActive = gameState?.current_activity?.item_id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setModalItem(item);
                    setModalType('CRAFTING');
                  }}
                  className="resource-card"
                  style={{
                    borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px',
                    opacity: locked ? 0.7 : 1,
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-soft)' : 'var(--slot-bg)',
                    width: '100%',
                    textAlign: 'left',
                    border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'var(--panel-bg)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {item.icon ? (
                      <img src={item.icon} alt={item.name} style={{ width: item.scale || '130%', height: item.scale || '130%', objectFit: 'contain', filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none' }} />
                    ) : (
                      locked ? <Lock size={20} color="#555" /> : <Layers size={20} style={{ opacity: 0.7 }} color="var(--accent)" />
                    )}
                  </div>

                  <div style={{ flex: '1 1 0%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? 'var(--text-dim)' : (isActive ? 'var(--accent)' : 'var(--text-main)') }}>
                        {item.name}
                        {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
                      </span>
                    </div>
                    {(resolved.desc || resolved.description) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px', fontStyle: 'italic' }}>
                        {resolved.desc || resolved.description}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        <span>T{item.tier}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                        <Clock size={12} color="var(--text-dim)" />
                        <span>{item.time || 3.0}s</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                        <Star size={12} color="var(--text-dim)" />
                        <span>{item.xp} XP</span>
                      </div>
                      {statsList.map((stat, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: locked ? '#555' : stat.color, border: '1px solid var(--border)' }}>
                          {React.cloneElement(stat.icon, { size: 12, color: locked ? '#555' : stat.color })}
                          <span>{stat.val}</span>
                        </div>
                      ))}
                      {Object.entries(reqs).map(([reqId, reqQty]) => {
                        const entry = gameState?.state?.inventory?.[reqId];
                        const userQty = getSafeAmount(entry);
                        const hasEnough = userQty >= reqQty;
                        return (
                          <div key={reqId} style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            background: hasEnough ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            color: hasEnough ? '#4caf50' : '#ff4444',
                            border: `1px solid ${hasEnough ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`
                          }}>
                            <span>{userQty}/{reqQty} {formatItemId(reqId)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {isActive && (
                      <ActivityProgressBar activity={gameState.current_activity} serverTimeOffset={0} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CraftingPage;
