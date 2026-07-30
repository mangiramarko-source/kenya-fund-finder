import React, { useState, useMemo } from 'react';
import { Fund } from '../types';
import { ShieldCheck, ArrowUpDown, Filter, ExternalLink, Info, Calculator, CheckCircle2, ChevronRight, Search } from 'lucide-react';

interface FundListProps {
  funds: Fund[];
  loading: boolean;
  searchQuery: string;
  onOpenCalculator: (fund: Fund) => void;
}

export const FundList: React.FC<FundListProps> = ({
  funds,
  loading,
  searchQuery,
  onOpenCalculator
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLicensed, setFilterLicensed] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'annual_yield' | 'daily_yield' | 'minimum_investment' | 'name'>('annual_yield');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);

  const filteredFunds = useMemo(() => {
    return funds
      .filter((fund) => {
        const matchesSearch = 
          fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fund.manager.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (fund.description && fund.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType = filterType === 'all' || fund.fund_type === filterType;
        const matchesLicense = !filterLicensed || fund.cma_licensed;

        return matchesSearch && matchesType && matchesLicense;
      })
      .sort((a, b) => {
        let valA = a[sortField] ?? 0;
        let valB = b[sortField] ?? 0;

        if (typeof valA === 'string') valA = (valA as string).toLowerCase();
        if (typeof valB === 'string') valB = (valB as string).toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [funds, searchQuery, filterType, filterLicensed, sortField, sortOrder]);

  const toggleSort = (field: 'annual_yield' | 'daily_yield' | 'minimum_investment' | 'name') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 64px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Money Market & Unit Trust Funds 
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>({filteredFunds.length} available)</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            All yields shown are net effective rates per annum, updated daily.
          </p>
        </div>

        {/* Filters & Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: 'rgba(18, 26, 43, 0.8)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Fund Types</option>
            <option value="money_market">Money Market Funds (KES)</option>
            <option value="fixed_income">Fixed Income / Bond Funds</option>
            <option value="special">Special / High Yield</option>
          </select>

          <button
            onClick={() => setFilterLicensed(!filterLicensed)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: filterLicensed ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: filterLicensed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(18, 26, 43, 0.8)',
              color: filterLicensed ? '#34d399' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={16} /> CMA Licensed Only
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(16, 185, 129, 0.3)', borderTopColor: '#10b981', borderRadius: '50%', margin: '0 auto 16px' }}></div>
            Loading latest Money Market Fund yields...
          </div>
        ) : filteredFunds.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No funds match your current filter criteria. Try clearing search or filters.
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }} onClick={() => toggleSort('name')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      FUND & MANAGER <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('annual_yield')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      ANNUAL YIELD (%) <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('daily_yield')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      DAILY YIELD (%) <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('minimum_investment')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      MIN. INITIAL <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th>MGMT FEE</th>
                  <th>CMA STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFunds.map((fund) => (
                  <tr key={fund.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {fund.name}
                          {fund.cma_licensed && <span title="Regulated by CMA Kenya"><CheckCircle2 size={15} color="#10b981" /></span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {fund.manager}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: fund.annual_yield > 12 ? '#fbbf24' : '#34d399' }}>
                        {fund.annual_yield > 0 ? `${fund.annual_yield.toFixed(2)}%` : 'N/A'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {fund.daily_yield > 0 ? `${fund.daily_yield.toFixed(2)}%` : '-'}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {formatCurrency(fund.minimum_investment)}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {fund.management_fee ? `${fund.management_fee}% p.a.` : '2.0%'}
                      </div>
                    </td>

                    <td>
                      {fund.cma_licensed ? (
                        <span className="badge">CMA Licensed</span>
                      ) : (
                        <span className="badge badge-gray">Private / Special</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => onOpenCalculator(fund)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          title="Calculate returns"
                        >
                          <Calculator size={14} /> Calculate
                        </button>
                        <button
                          onClick={() => setSelectedFund(fund)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          Details <ChevronRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fund Detail Drawer / Modal */}
      {selectedFund && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span className="badge" style={{ marginBottom: '8px' }}>{selectedFund.fund_type.toUpperCase()}</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedFund.name}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Managed by {selectedFund.manager}</p>
              </div>
              <button onClick={() => setSelectedFund(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ANNUAL YIELD</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{selectedFund.annual_yield}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MINIMUM INVESTMENT</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(selectedFund.minimum_investment)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WITHDRAWAL TIME</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedFund.withdrawal_time || '1 - 3 Days'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MANAGEMENT FEE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{selectedFund.management_fee}% p.a.</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Fund Overview</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {selectedFund.description || "The fund invests in high-quality short-term money market securities including Treasury bills, fixed deposits, and corporate commercial papers to guarantee capital preservation and daily liquidity."}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedFund(null)}>Close</button>
              {selectedFund.website && (
                <a href={selectedFund.website} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Official Portal <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
