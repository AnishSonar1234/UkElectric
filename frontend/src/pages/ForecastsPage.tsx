import React, { useState } from 'react';
import { TrendingUp, Search, Clock, Layers, AlertCircle } from 'lucide-react';
import type { EvaluationResponse } from '../types';
import { ForecastChart } from '../components/ForecastChart';

interface ForecastsPageProps {
  data: EvaluationResponse | null;
  loading: boolean;
  error: string | null;
  onInspectPeriod: (deliveryTime: string) => void;
}

export const ForecastsPage: React.FC<ForecastsPageProps> = ({
  data,
  loading,
  error,
  onInspectPeriod
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading eligible wind forecast vintages from Elexon...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error-color)' }}>
          <AlertCircle size={20} />
          <span>{error || 'No forecast data available.'}</span>
        </div>
      </div>
    );
  }

  const { matched_records, delivery_date, decision_cutoff } = data;

  const filteredRecords = matched_records.filter((r) =>
    r.delivery_time.includes(searchTerm) || r.publish_time.includes(searchTerm)
  );

  return (
    <div>
      {/* Forecast Profile Chart Panel */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <TrendingUp size={18} color="var(--forecast-color)" />
              Eligible Day-Ahead Wind Forecast (WINDFOR)
            </div>
            <div className="panel-subtitle">
              Delivery Date: {delivery_date} | Decision Cutoff: {decision_cutoff} (EPEX SPOT Gate Closure)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span>Resolution: Hourly delivery periods (:00 UTC)</span>
          </div>
        </div>

        <ForecastChart data={matched_records} height={360} />
      </div>

      {/* Forecast Data Table Panel */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <Layers size={18} color="var(--forecast-color)" />
              Delivery Periods &amp; Selected Vintages
            </div>
            <div className="panel-subtitle">
              Every period displays the exact forecast vintage selected deterministically at gate closure.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search hour (e.g. 14:00)..."
                className="filter-input"
                style={{ paddingLeft: '2rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivery Timestamp (UTC)</th>
                <th>Settlement Period</th>
                <th>Selected Forecast (MW)</th>
                <th>Publication Timestamp (UTC)</th>
                <th>Forecast Lead Time</th>
                <th>Cutoff Verification</th>
                <th>Vintage History</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, i) => (
                <tr key={i}>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {r.delivery_time}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    SP {r.settlement_period || (i + 1) * 2 - 1}
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--forecast-color)', fontSize: '0.95rem' }}>
                    {r.forecast_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {r.publish_time}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {r.lead_time_hours} hours
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      Prior to Cutoff ({decision_cutoff.slice(11, 16)} UTC)
                    </span>
                  </td>
                  <td>
                    <button
                      className="quick-day-btn"
                      onClick={() => onInspectPeriod(r.delivery_time)}
                      title="Inspect all published forecast vintages for this specific hour"
                    >
                      Inspect Vintages
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
