import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../utils/format';

const TaxHistoryChart = ({ history = [], totalTax, tax_24h_ago, isMobile }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const formatDayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const displayData = useMemo(() => {
    const todayIncrease = Math.max(0, totalTax - (tax_24h_ago || 0));

    const data = [];
    for (let i = 6; i >= 1; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const historyItem = history.find(h => {
        const hDate = new Date(h.date).toISOString().split('T')[0];
        return hDate === dateStr;
      });

      data.push({
        amount: historyItem ? historyItem.amount : 0,
        label: formatDayDate(d)
      });
    }

    data.push({
      amount: todayIncrease,
      label: 'TODAY'
    });

    return data;
  }, [totalTax, tax_24h_ago, history]);

  const maxVal = Math.max(...displayData.map(h => h.amount), 1000);
  const chartHeight = 50;
  const barWidth = isMobile ? 25 : 35;
  const gap = 8;
  const totalWidth = (barWidth + gap) * displayData.length - gap;

  return (
    <div style={{
      marginTop: '5px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'var(--slot-bg)',
      padding: '15px 10px',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      position: 'relative'
    }}>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>DAILY TAX INCREASE (LAST 7 DAYS)</div>

      <div style={{ height: '15px', marginBottom: '5px' }}>
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{
                fontSize: '0.7rem',
                color: 'var(--accent)',
                fontWeight: '900',
                fontFamily: 'monospace'
              }}
            >
              +{formatNumber(displayData[hoveredIndex].amount)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <svg width={totalWidth} height={chartHeight + 20} style={{ overflow: 'visible' }}>
        {displayData.map((day, i) => {
          const h = Math.max(4, (day.amount / maxVal) * chartHeight);
          return (
            <g key={i}>
              <motion.rect
                initial={{ height: 0, y: chartHeight }}
                animate={{
                  height: h,
                  y: chartHeight - h,
                  fillOpacity: hoveredIndex === i ? 1 : 0.4 + (i * 0.08)
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                transition={{
                  height: { delay: i * 0.05, duration: 0.5 },
                  fillOpacity: { duration: 0.2 }
                }}
                x={i * (barWidth + gap)}
                width={barWidth}
                fill="var(--accent)"
                rx="3"
                style={{ cursor: 'pointer' }}
              />
              <text
                x={i * (barWidth + gap) + barWidth / 2}
                y={chartHeight + 15}
                textAnchor="middle"
                style={{
                  fontSize: '0.55rem',
                  fill: hoveredIndex === i ? 'var(--text-main)' : 'var(--text-dim)',
                  fontWeight: hoveredIndex === i ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                  fontFamily: 'monospace'
                }}
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default TaxHistoryChart;
