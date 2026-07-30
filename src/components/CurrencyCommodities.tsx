import React, { useState } from 'react';
import { ExchangeRate, Commodity } from '../types';
import { DollarSign, ArrowRightLeft, Coins, RefreshCw, Flame, Globe } from 'lucide-react';

interface CurrencyCommoditiesProps {
  rates: ExchangeRate[];
  commodities: Commodity[];
  loading: boolean;
}

export const CurrencyCommodities: React.FC<CurrencyCommoditiesProps> = ({
  rates,
  commodities,
  loading
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');

  const selectedRateObj = rates.find((r) => r.currency_code === selectedCurrency);
  const rateValue = selectedRateObj ? selectedRateObj.rate : 129.52;
  const convertedKes = amount * rateValue;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 64px' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Foreign Exchange & Global Commodity Prices
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Central Bank of Kenya (CBK) official exchange rates and real-time prices for gold, crude oil, coffee, and crypto.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* FX Currency Converter Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={18} color="#10b981" /> KES Currency Converter
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>FOREIGN CURRENCY AMOUNT</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  style={{
                    flex: 1,
                    background: 'rgba(11, 15, 25, 0.8)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  style={{
                    background: 'rgba(11, 15, 25, 0.8)',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {rates.map((r) => (
                    <option key={r.currency_code} value={r.currency_code}>
                      {r.currency_code}
                    </option>
                  ))}
                  {!rates.length && <option value="USD">USD</option>}
                </select>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>EQUIVALENT IN KENYA SHILLINGS (KES)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                KES {convertedKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                1 {selectedCurrency} = {rateValue.toFixed(4)} KES
              </div>
            </div>
          </div>
        </div>

        {/* Live Exchange Rates List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="#60a5fa" /> Major Foreign Currencies vs KES
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
            {rates.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{r.currency_code}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.currency_name || `${r.currency_code} Rate`}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#34d399' }}>KES {r.rate.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Commodities Grid */}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Coins size={20} color="#fbbf24" /> Live Commodities & Crypto Benchmark
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {commodities.map((c) => (
          <div key={c.id} className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.symbol}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{c.name}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>
              ${c.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Per {c.unit || 'Unit'}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
