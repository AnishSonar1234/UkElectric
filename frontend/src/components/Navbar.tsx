import React from 'react';
import { Wind, Activity, TrendingUp, BarChart2, BookOpen, Clock } from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'forecasts' | 'accuracy' | 'methodology';
  setActiveTab: (tab: 'overview' | 'forecasts' | 'accuracy' | 'methodology') => void;
  upstreamConnected: boolean;
  cacheCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  upstreamConnected,
  cacheCount
}) => {
  return (
    <nav className="navbar">
      <div className="nav-wrapper">
        <div className="brand-section">
          <div className="brand-logo">
            <Wind size={22} />
          </div>
          <div>
            <div className="brand-title">
              WindSight Analytics
              <span className="brand-tag">Day-Ahead</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              UK National Wind Procurement Decision Support
            </div>
          </div>
        </div>

        <div className="nav-links">
          <button
            className={`nav-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={16} />
            Overview
          </button>
          <button
            className={`nav-button ${activeTab === 'forecasts' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecasts')}
          >
            <TrendingUp size={16} />
            Wind Forecasts
          </button>
          <button
            className={`nav-button ${activeTab === 'accuracy' ? 'active' : ''}`}
            onClick={() => setActiveTab('accuracy')}
          >
            <BarChart2 size={16} />
            Forecast Accuracy
          </button>
          <button
            className={`nav-button ${activeTab === 'methodology' ? 'active' : ''}`}
            onClick={() => setActiveTab('methodology')}
          >
            <BookOpen size={16} />
            Methodology
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="status-badge" title="Live status of Elexon BMRS Insights API connection">
            <div
              className="status-dot"
              style={{
                backgroundColor: upstreamConnected ? 'var(--actual-color)' : 'var(--error-color)',
                boxShadow: upstreamConnected ? '0 0 8px var(--actual-color)' : '0 0 8px var(--error-color)'
              }}
            />
            <span>{upstreamConnected ? 'Elexon BMRS Live' : 'Elexon Reconnecting'}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
            title="Local cached responses for sub-millisecond query performance"
          >
            <Clock size={13} />
            <span>Cache: {cacheCount}</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
