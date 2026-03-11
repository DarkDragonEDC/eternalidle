import React from 'react';
import { formatNumber } from '../utils/format';

const StatCard = ({ label, value, icon, color }) => (
  <div className="glass-panel" style={{
    padding: '15px',
    borderRadius: '12px',
    background: 'var(--accent-soft)',
    border: '1px solid var(--border)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  }}>
    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
    <div style={{ fontSize: '1.2rem', color: color || 'var(--text-main)', fontWeight: '900', fontFamily: 'monospace' }}>
      {formatNumber(value)}
    </div>
  </div>
);

export default StatCard;
