import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { mapTabCategoryToSkill } from '../utils/SkillUtils';
import { formatNumber } from '../utils/format';
import { formatItemId } from '@shared/items';
import { calculateNextLevelXP, XP_TABLE } from '@shared/skills';
import { SKILL_DESCRIPTIONS } from '@shared/skill_descriptions';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SkillProgressHeader = ({ tab, category }) => {
  const { gameState } = useAppStore();
  const [showInfo, setShowInfo] = useState(false);
  const displayedGameState = gameState; // Assuming it takes the latest from store

  if (!displayedGameState?.state?.skills) return null;

  const skillKey = mapTabCategoryToSkill(tab, category);
  const skill = displayedGameState.state.skills[skillKey] || { level: 1, xp: 0 };

  if (skillKey === 'RUNE') {
    return (
      <div className="glass-panel" style={{
        padding: '12px 20px',
        marginBottom: '15px',
        background: 'var(--accent-soft)',
        border: '1px solid var(--border-active)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {formatItemId(category)}
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: 'var(--slot-bg)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showInfo ? 'var(--accent)' : 'var(--text-dim)',
              transition: '0.2s'
            }}
          >
            <Info size={12} />
          </button>
        </div>
        <AnimatePresence>
          {showInfo && SKILL_DESCRIPTIONS[skillKey] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                background: 'rgba(0,0,0,0.3)', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                position: 'relative'
              }}>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                  {SKILL_DESCRIPTIONS[skillKey].map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const nextXP = calculateNextLevelXP(skill.level);
  const progress = Math.min(100, (skill.xp / nextXP) * 100);

  return (
    <div className="glass-panel" style={{
      padding: '12px 20px',
      marginBottom: '15px',
      background: 'var(--accent-soft)',
      border: '1px solid var(--border-active)',
      borderRadius: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {formatItemId(category)}
          </div>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: 'var(--slot-bg)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: showInfo ? 'var(--accent)' : 'var(--text-dim)',
              transition: '0.2s'
            }}
          >
            <Info size={12} />
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--text-main)' }}>
            Lv {skill.level} <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>({Math.floor(progress)}%)</span>
          </div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>
            {formatNumber((XP_TABLE[skill.level - 1] || 0) + skill.xp)} / {XP_TABLE[skill.level] ? formatNumber(XP_TABLE[skill.level]) : 'MAX'} XP
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInfo && SKILL_DESCRIPTIONS[skillKey] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '8px', 
              border: '1px solid var(--border)',
              position: 'relative'
            }}>
              <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: '1.5' }}>
                {SKILL_DESCRIPTIONS[skillKey].map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <button 
                onClick={() => setShowInfo(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ height: '3px', background: 'var(--slot-bg)', borderRadius: '2px', overflow: 'hidden', marginTop: '10px' }}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent-soft)',
            transition: 'width 0.2s ease-out'
          }}
        />
      </div>
    </div>
  );
};

export default SkillProgressHeader;
