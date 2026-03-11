import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { mapTabCategoryToSkill } from '../utils/SkillUtils';
import { formatNumber } from '../utils/format';
import { formatItemId } from '@shared/items';
import { calculateNextLevelXP, XP_TABLE } from '@shared/skills';

const SkillProgressHeader = ({ tab, category }) => {
  const { gameState } = useAppStore();
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
        <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {formatItemId(category)}
        </div>
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
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {formatItemId(category)}
          </div>
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
