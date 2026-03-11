import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Pickaxe, Box, Clock, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ITEMS, getLevelRequirement } from '@shared/items';
import { mapTabCategoryToSkill } from '../utils/SkillUtils';
import { calculateNextLevelXP } from '@shared/skills';
import SkillProgressHeader from '../components/SkillProgressHeader';
import ActivityProgressBar from '../components/ActivityProgressBar';
import { isLocked, getSafeAmount } from '../utils/gameUtils';

const GatheringPage = () => {
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

  const isGathering = activeTab === 'gathering';
  const activeCategoryData = isGathering ? ITEMS.RAW[activeCategory] : ITEMS.REFINED[activeCategory];
  const itemsToRender = Object.values(activeCategoryData || {}).filter(item => item.tier === activeTier);

  if (!activeCategoryData || Object.keys(activeCategoryData).length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SkillProgressHeader tab={activeTab} category={activeCategory} />
        <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(15, 20, 30, 0.4)' }}>
          <div style={{ textAlign: 'center', opacity: 0.5 }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧪</div>
            <h2 style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: '900', letterSpacing: '2px' }}>COMING SOON</h2>
            <p style={{ color: '#888' }}>Alchemy system in development.</p>
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
            {activeCategory.replace(/_/g, ' ')} {isGathering ? 'GATHERING' : 'REFINING'}
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
              const locked = isLocked(isGathering ? 'GATHERING' : 'REFINING', item, gameState);
              const reqLevel = getLevelRequirement(item.tier);
              const reqs = item.req || {}; 

              const isActive = gameState?.current_activity?.item_id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setModalItem(item);
                    setModalType(isGathering ? 'GATHERING' : 'REFINING');
                  }}
                  disabled={false}
                  className="resource-card"
                  style={{
                    borderLeft: isActive ? '4px solid var(--accent)' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    padding: '12px',
                    opacity: locked ? 0.7 : 1,
                    cursor: 'pointer',
                    filter: 'none',
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
                  onMouseEnter={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'var(--accent-soft)'; }}
                  onMouseLeave={(e) => { if (!locked && !isActive) e.currentTarget.style.background = 'var(--slot-bg)'; }}
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
                      <img
                        src={item.icon}
                        alt={item.name}
                        style={{
                          width: item.scale || '100%',
                          height: item.scale || '100%',
                          objectFit: 'contain',
                          filter: locked ? 'grayscale(100%) opacity(0.5)' : 'none'
                        }}
                      />
                    ) : (
                      isGathering ? (
                        <Pickaxe size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                      ) : (
                        <Box size={24} style={{ opacity: 0.7 }} color={locked ? '#555' : 'var(--accent)'} />
                      )
                    )}
                  </div>

                  <div style={{ flex: '1 1 0%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: locked ? 'var(--text-dim)' : (isActive ? 'var(--accent)' : 'var(--text-main)') }}>
                        {item.name}
                        {locked && <Lock size={14} color="#f87171" />}
                        {isActive && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '0.6rem', background: 'var(--accent)', color: 'var(--bg-dark)', padding: '1px 4px', borderRadius: '3px', fontWeight: '900' }}>ACTIVE</motion.span>}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        <span>T{item.tier}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                        <Clock size={12} color="var(--text-dim)" />
                        <span>{item.time || (isGathering ? '3.0' : '1.5')}s</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
                        <Star size={12} color="var(--text-dim)" />
                        <span>{item.xp} XP</span>
                      </div>

                      {locked && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                          <span>Req Lv {reqLevel}</span>
                        </div>
                      )}

                      {!isGathering && reqs && Object.entries(reqs).map(([reqId, reqQty]) => {
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
                            <span>{userQty}/{reqQty} {reqId}</span>
                          </div>
                        );
                      })}
                    </div>

                    {isActive && (
                      <ActivityProgressBar
                        activity={gameState.current_activity}
                        serverTimeOffset={0} // App store clockOffset could be used but 0 is default
                      />
                    )}
                    {isActive && (
                      <div style={{ fontSize: '0.6rem', color: 'var(--accent)', marginTop: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                        {gameState.current_activity.initial_quantity - gameState.current_activity.actions_remaining}/{gameState.current_activity.initial_quantity}
                      </div>
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

export default GatheringPage;
