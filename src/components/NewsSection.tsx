import React from 'react';
import { NewsArticle } from '../types';
import { Newspaper, ExternalLink, Calendar, Clock, Bookmark } from 'lucide-react';
import { decodeHtmlEntities } from '../lib/utils';

interface NewsSectionProps {
  articles: NewsArticle[];
  loading: boolean;
}

export const NewsSection: React.FC<NewsSectionProps> = ({ articles, loading }) => {
  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 64px' }}>
      
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Newspaper size={24} color="#60a5fa" /> Kenya Financial & Market News
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Latest updates on Money Market Funds, Central Bank of Kenya interest rate policy, NSE stocks, and macro economy.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading financial news...
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Market Updates</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            CBK keeps benchmark rate steady as money market yields average 11.5% across top fund managers.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {articles.map((item) => (
            <div key={item.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}>
                    {item.category || 'FINANCE'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {item.read_time || '3 min read'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '10px', lineHeight: 1.4 }}>
                  {decodeHtmlEntities(item.title)}
                </h3>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                  {item.summary ? decodeHtmlEntities(item.summary) : ""}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Source: {item.source}</span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                    Read Full Article <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
