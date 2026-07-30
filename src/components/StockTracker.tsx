import React, { useState, useMemo } from 'react';
import { Stock } from '../types';
import { BarChart3, TrendingUp, TrendingDown, Search, ArrowUpDown, Building2 } from 'lucide-react';

interface StockTrackerProps {
  stocks: Stock[];
  loading: boolean;
}

export const StockTracker: React.FC<StockTrackerProps> = ({ stocks, loading }) => {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [sortField, setSortField] = useState<'price' | 'day_change_percent' | 'volume' | 'symbol'>('day_change_percent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sectors = useMemo(() => {
    const list = stocks.map(s => s.sector).filter(Boolean);
    return ['all', ...Array.from(new Set(list))];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks
      .filter((s) => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase());
        const matchesSector = sectorFilter === 'all' || s.sector === sectorFilter;
        return matchesSearch && matchesSector;
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
  }, [stocks, search, sectorFilter, sortField, sortOrder]);

  const toggleSort = (field: 'price' | 'day_change_percent' | 'volume' | 'symbol') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const topGainers = useMemo(() => {
    return [...stocks].sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 4);
  }, [stocks]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 64px' }}>
      
      {/* Top Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Nairobi Securities Exchange (NSE) Live Tracker
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Real-time share prices, daily percentage change, trading volumes, and dividend metrics for NSE listed equities.
        </p>
      </div>

      {/* Top Gainers Showcase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {topGainers.map((s) => (
          <div key={s.id} className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{s.symbol}</span>
              <span className="badge" style={{ background: s.day_change_percent >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: s.day_change_percent >= 0 ? '#34d399' : '#f87171' }}>
                {s.day_change_percent >= 0 ? '+' : ''}{s.day_change_percent.toFixed(2)}%
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>KES {s.price.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(18, 26, 43, 0.8)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 12px', minWidth: '280px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search stock symbol or company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: '6px 10px', fontSize: '0.85rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
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
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'all' ? 'All Sectors' : sec.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading NSE stock quotes...
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('symbol')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      SYMBOL & COMPANY <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('price')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      PRICE (KES) <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('day_change_percent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      24H CHANGE <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th onClick={() => toggleSort('volume')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      VOLUME <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th>SECTOR</th>
                  <th>PREVIOUS CLOSE</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((s) => {
                  const isPositive = s.day_change_percent >= 0;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{s.symbol}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.name}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                          KES {s.price.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isPositive ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isPositive ? '+' : ''}{s.day_change_percent.toFixed(2)}%
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {s.volume ? s.volume.toLocaleString() : '-'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{s.sector || 'Main Investment'}</span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          KES {s.previous_price ? s.previous_price.toFixed(2) : s.price.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
