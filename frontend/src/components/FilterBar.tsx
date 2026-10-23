import React from 'react';
import { Calendar, Clock, RefreshCw, ArrowRight } from 'lucide-react';

interface FilterBarProps {
  decisionDate: string;
  setDecisionDate: (date: string) => void;
  deliveryDate: string;
  cutoffTime: string;
  setCutoffTime: (time: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const QUICK_DECISION_DATES = [
  { label: 'Jan 01', date: '2026-01-01' },
  { label: 'Jan 10', date: '2026-01-10' },
  { label: 'Jan 15', date: '2026-01-15' },
  { label: 'Jan 20', date: '2026-01-20' },
  { label: 'Jan 31 (Month Cross)', date: '2026-01-31' }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  decisionDate,
  setDecisionDate,
  deliveryDate,
  cutoffTime,
  setCutoffTime,
  onRefresh,
  loading
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        {/* Decision Date Filter */}
        <div className="filter-item">
          <label className="filter-label">
            <Calendar size={13} />
            Decision Date (D-1)
          </label>
          <input
            type="date"
            className="filter-input"
            value={decisionDate}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => setDecisionDate(e.target.value)}
          />
        </div>

        {/* Quick Date Presets */}
        <div className="filter-item">
          <span className="filter-label">Quick Presets</span>
          <div className="quick-days">
            {QUICK_DECISION_DATES.map((item) => (
              <button
                key={item.date}
                className={`quick-day-btn ${decisionDate === item.date ? 'active' : ''}`}
                onClick={() => setDecisionDate(item.date)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Arrow to Delivery Date */}
        <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', paddingTop: '1.2rem' }}>
          <ArrowRight size={18} />
        </div>

        {/* Resulting Delivery Date Display */}
        <div className="filter-item">
          <label className="filter-label">Delivery Date (D)</label>
          <div
            className="filter-input tabular-nums"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderColor: 'rgba(16, 185, 129, 0.3)',
              color: 'var(--actual-color)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>{deliveryDate}</span>
            {decisionDate === '2026-01-31' && (
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.2)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>
                Feb Boundary
              </span>
            )}
          </div>
        </div>

        {/* Decision Cutoff Selector */}
        <div className="filter-item">
          <label className="filter-label" title="EPEX SPOT UK Day-Ahead auction order book closes at 11:00 UTC">
            <Clock size={13} />
            Decision Cutoff (UTC)
          </label>
          <select
            className="filter-input"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
          >
            <option value="11:00:00">11:00:00 (EPEX SPOT Auction Gate Closure)</option>
            <option value="09:00:00">09:00:00 (Early Morning Strategy)</option>
            <option value="12:00:00">12:00:00 (Midday Market Auction)</option>
            <option value="15:30:00">15:30:00 (GB Half-Hourly DAM Auction)</option>
            <option value="17:00:00">17:00:00 (End of Day Intraday Gate)</option>
            <option value="23:59:59">23:59:59 (Full Day Retroactive)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          className="action-btn"
          onClick={onRefresh}
          disabled={loading}
          title="Fetch latest forecasts and actuals from Elexon"
        >
          <RefreshCw size={15} className={loading ? 'spinner' : ''} />
          {loading ? 'Fetching...' : 'Run Evaluation'}
        </button>
      </div>
    </div>
  );
};
