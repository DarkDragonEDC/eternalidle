import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { formatNumber } from '../utils/format';
import StatCard from '../components/StatCard';
import TaxHistoryChart from '../components/TaxHistoryChart';

const TaxometerPage = () => {
  const {
    globalStats,
    isMobile
  } = useAppStore();

  const marketTax = globalStats?.market_tax_total || 0;
  const tradeTax = globalStats?.trade_tax_total || 0;
  const totalTax = globalStats?.total_market_tax || 0;
  const taxHistory = globalStats?.history || [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? '10px' : '20px', justifyContent: 'center', height: '100%', overflowY: 'auto' }}>
      <div className="glass-panel" style={{
        padding: isMobile ? '20px' : '30px',
        borderRadius: '16px',
        background: 'var(--panel-bg)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '15px' : '20px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div>
          <div style={{ color: 'var(--accent)', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '3px', marginBottom: '8px' }}>GLOBAL ECONOMY</div>
          <h2 style={{ color: 'var(--text-main)', fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: '900', letterSpacing: '2px', margin: 0 }}>
            TAXOMETER
          </h2>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem', marginTop: '8px', opacity: 0.7 }}>
            * Updates periodically (every 30 minutes)
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: isMobile ? '20px 10px' : '30px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 215, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 'bold' }}>TOTAL TAXES COLLECTED</div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px', marginBottom: '5px' }}>
            <motion.div
              key={totalTax}
              initial={{ scale: 1.1, color: '#fff' }}
              animate={{ scale: 1, color: 'var(--accent)' }}
              transition={{ duration: 0.5 }}
              style={{
                fontSize: isMobile ? '2rem' : '2.5rem',
                fontWeight: '900',
                fontFamily: 'monospace',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              {formatNumber(totalTax)}
            </motion.div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(74, 222, 128, 0.6)', fontSize: '0.65rem', fontWeight: 'bold' }}>
            <div style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 8px #4ade80' }}></div>
            LIVE COUNTER
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <StatCard label="Marketplace" value={marketTax} color="var(--t5)" />
          <StatCard label="Player Trades" value={tradeTax} color="var(--t3)" />
        </div>

        <TaxHistoryChart
          history={taxHistory}
          totalTax={totalTax}
          tax_24h_ago={globalStats?.tax_24h_ago}
          isMobile={isMobile}
        />

        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: isMobile ? '0.7rem' : '0.8rem', lineHeight: '1.5', maxWidth: '450px', margin: '0 auto' }}>
          <p style={{ margin: 0 }}>
            Monitoring the global flow of Silver.
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}> 20% </span> from Market and
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}> 15% </span> from Trades are collected to maintain a healthy economy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TaxometerPage;
