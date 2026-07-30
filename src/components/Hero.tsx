import React from 'react';
import { TrendingUp, ShieldCheck, DollarSign, Award, ArrowUpRight, Search } from 'lucide-react';

interface HeroProps {
  totalFunds: number;
  topYield: number;
  avgYield: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onExplore: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  totalFunds,
  topYield,
  avgYield,
  searchQuery,
  setSearchQuery,
  onExplore
}) => {
  return (
    <div style={{ padding: '48px 24px 32px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '30px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '20px' }}>
          <ShieldCheck size={16} color="#34d399" />
          <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>CMA Regulated Funds & Official Market Intelligence</span>
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px', letterSpacing: '-0.03em' }}>
          Find the Highest Daily Yields on <br />
          <span className="gradient-text">Kenya Money Market Funds</span>
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto 32px', lineHeight: 1.6 }}>
          Compare real-time effective yields, minimum investment requirements, withdrawal speeds, and CMA license status across 85+ Unit Trust funds in Kenya.
        </p>

        {/* Global Search Bar */}
        <div style={{ maxWidth: '640px', margin: '0 auto 40px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(18, 26, 43, 0.9)', border: '1px solid var(--border-glow)', borderRadius: '16px', padding: '8px 12px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)' }}>
            <Search size={20} color="var(--text-muted)" style={{ marginLeft: '8px' }} />
            <input
              type="text"
              placeholder="Search by fund name (e.g. CIC, Britam, ICEA, Kuza), manager, or stock symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                padding: '12px 16px',
                fontSize: '1rem'
              }}
            />
            <button className="btn-primary" onClick={onExplore}>
              Compare Now
            </button>
          </div>
        </div>

        {/* Key Market Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', maxWidth: '1080px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>FUNDS TRACKED</span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{totalFunds || 88}</div>
            <div style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <ArrowUpRight size={14} /> Active CMA Licensed & Special Funds
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>TOP MMF ANNUAL YIELD</span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Award size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>
              {topYield ? `${topYield.toFixed(2)}%` : '14.80%'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Net Effective Annual Return
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>AVG MARKET YIELD</span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
              {avgYield ? `${avgYield.toFixed(2)}%` : '11.45%'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '4px' }}>
              Outperforming Bank Fixed Deposits
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>CBK EXCHANGE RATE</span>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                <DollarSign size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>KES 129.52</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              USD / KES Spot Rate
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
