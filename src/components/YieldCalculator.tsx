import React, { useState } from 'react';
import { Fund } from '../types';
import { Calculator, TrendingUp, DollarSign, Calendar, Sparkles } from 'lucide-react';

interface YieldCalculatorProps {
  funds: Fund[];
  initialFund?: Fund | null;
}

export const YieldCalculator: React.FC<YieldCalculatorProps> = ({ funds, initialFund }) => {
  const [selectedFundId, setSelectedFundId] = useState<string>(initialFund ? initialFund.id : (funds[0]?.id || ''));
  const [initialDeposit, setInitialDeposit] = useState<number>(100000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(10000);
  const [periodMonths, setPeriodMonths] = useState<number>(12);
  const [customYield, setCustomYield] = useState<number>(11.5);

  const currentFund = funds.find(f => f.id === selectedFundId);
  const annualRate = currentFund ? currentFund.annual_yield : customYield;

  // Compound Interest Calculation (Daily compounding typical for MMFs in Kenya)
  const calculateProjections = () => {
    const dailyRate = annualRate / 100 / 365;
    let totalBalance = initialDeposit;
    let totalInvested = initialDeposit;
    const monthlyBreakdown: Array<{ month: number; balance: number; interest: number; invested: number }> = [];

    for (let m = 1; m <= periodMonths; m++) {
      // 30 days compounding per month
      for (let d = 0; d < 30; d++) {
        totalBalance += totalBalance * dailyRate;
      }
      totalBalance += monthlyContribution;
      totalInvested += monthlyContribution;

      const earnedInterest = totalBalance - totalInvested;
      monthlyBreakdown.push({
        month: m,
        balance: Math.round(totalBalance),
        interest: Math.round(earnedInterest),
        invested: totalInvested
      });
    }

    return {
      finalBalance: Math.round(totalBalance),
      totalInvested,
      totalInterest: Math.round(totalBalance - totalInvested),
      monthlyBreakdown
    };
  };

  const results = calculateProjections();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 64px' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calculator size={24} color="#10b981" /> Money Market Fund Yield Calculator
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Simulate compound daily growth, monthly top-ups, and net interest earnings across Kenya's top Money Market Funds.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Input Parameters Form */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="#fbbf24" /> Investment Parameters
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>SELECT MONEY MARKET FUND</label>
              <select
                value={selectedFundId}
                onChange={(e) => setSelectedFundId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(11, 15, 25, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.annual_yield}% p.a.)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>INITIAL DEPOSIT (KES)</label>
              <input
                type="number"
                value={initialDeposit}
                onChange={(e) => setInitialDeposit(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'rgba(11, 15, 25, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>MONTHLY TOP-UP (KES)</label>
              <input
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'rgba(11, 15, 25, 0.8)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', display: 'block' }}>INVESTMENT PERIOD (MONTHS): {periodMonths} Months</label>
              <input
                type="range"
                min="1"
                max="60"
                value={periodMonths}
                onChange={(e) => setPeriodMonths(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>1 Mo</span>
                <span>12 Mo (1 Yr)</span>
                <span>36 Mo (3 Yrs)</span>
                <span>60 Mo (5 Yrs)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary Card */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span className="badge" style={{ marginBottom: '12px' }}>PROJECTED COMPOUND RETURNS</span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px' }}>
              {currentFund ? currentFund.name : 'Custom Fund'} Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PROJECTED FINAL VALUE</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                  {formatCurrency(results.finalBalance)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL CONTRIBUTED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {formatCurrency(results.totalInvested)}
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>COMPOUND INTEREST EARNED</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                    +{formatCurrency(results.totalInterest)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            * Projected returns assume daily compounding at {annualRate}% p.a. net effective yield. Actual rates fluctuate based on prevailing market interest rates and CMA regulations.
          </div>
        </div>

      </div>
    </div>
  );
};
