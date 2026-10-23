import React, { useState } from 'react';
import { BarChart2, TrendingUp, AlertTriangle, Search } from 'lucide-react';
import type { EvaluationResponse } from '../types';
import { MetricCard } from '../components/MetricCard';
import { ForecastChart } from '../components/ForecastChart';
import { ErrorChart } from '../components/ErrorChart';

interface AccuracyPageProps {
  data: EvaluationResponse | null;
  loading: boolean;
  error: string | null;
  onInspectPeriod: (deliveryTime: string) => void;
}

export const AccuracyPage: React.FC<AccuracyPageProps> = ({
  data,
  loading,
  error,
  onInspectPeriod
}) => {
  const [filterType, setFilterType] = useState<'all' | 'over' | 'under'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Calculating statistical forecast accuracy metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error-color)' }}>
          <AlertTriangle size={20} />
          <span>{error || 'No accuracy data available.'}</span>
        </div>
      </div>
    );
  }

  const { metrics, matched_records, delivery_date } = data;

  const filteredRecords = matched_records.filter((r) => {
    if (filterType === 'over' && r.classification !== 'overforecast') return false;
    if (filterType === 'under' && r.classification !== 'underforecast') return false;
    if (searchTerm && !r.delivery_time.includes(searchTerm)) return false;
    return true;
  });

  const overCount = matched_records.filter((r) => r.classification === 'overforecast').length;
  const underCount = matched_records.filter((r) => r.classification === 'underforecast').length;

  return (
    <div>
      {/* Primary Statistical KPI Cards */}
      <div className="metrics-grid">
        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={metrics.mae}
          unit="MW"
          subtitle="Typical magnitude of error"
          tone="info"
        />
        <MetricCard
          title="Root Mean Squared Error (RMSE)"
          value={metrics.rmse}
          unit="MW"
          subtitle="Penalizes large forecast swings"
          tone="default"
        />
        <MetricCard
          title="Mean Forecast Bias"
          value={metrics.bias > 0 ? `+${metrics.bias}` : metrics.bias}
          unit="MW"
          subtitle={metrics.bias > 0 ? 'Overforecasted on average' : 'Underforecasted on average'}
          tone={metrics.bias > 0 ? 'overforecast' : 'underforecast'}
          badge={metrics.bias > 0 ? 'Overforecasting' : 'Underforecasting'}
        />
        <MetricCard
          title="Mean Absolute Percentage Error"
          value={metrics.mape !== null ? `${metrics.mape}%` : 'N/A'}
          subtitle={`Evaluated on ${metrics.mape_sample_size} periods (>=100 MW)`}
          tone="success"
        />
        <MetricCard
          title="Matched Delivery Periods"
          value={`${metrics.matched_count} / ${metrics.total_forecast_periods}`}
          unit="Periods"
          subtitle="Exact timestamp alignment"
          tone="default"
        />
      </div>

      {/* Dual Comparative Charts Panel */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <TrendingUp size={18} color="var(--forecast-color)" />
              Forecast vs Actual National Wind Generation
            </div>
            <div className="panel-subtitle">
              Visualizing volume differences (MW) across the full delivery date {delivery_date}
            </div>
          </div>
        </div>
        <ForecastChart data={matched_records} height={320} />
      </div>

      {/* Error Breakdown Chart Panel */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <BarChart2 size={18} color="var(--overforecast-color)" />
              Delivery Period Forecast Error (F - A) in Megawatts
            </div>
            <div className="panel-subtitle">
              Positive values indicate overforecasting (amber); negative values indicate underforecasting (purple).
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--overforecast-color)' }}>
              ● Overforecasting ({overCount} periods)
            </span>
            <span style={{ color: 'var(--underforecast-color)' }}>
              ● Underforecasting ({underCount} periods)
            </span>
          </div>
        </div>
        <ErrorChart data={matched_records} height={280} />
      </div>

      {/* Detailed Observation Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              Detailed Matched Forecast-Actual Observations
            </div>
            <div className="panel-subtitle">
              Comprehensive breakdown of each period with error, absolute error, percentage error, and publication timestamps.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Filter buttons */}
            <div className="quick-days">
              <button
                className={`quick-day-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All ({matched_records.length})
              </button>
              <button
                className={`quick-day-btn ${filterType === 'over' ? 'active' : ''}`}
                onClick={() => setFilterType('over')}
              >
                Overforecast ({overCount})
              </button>
              <button
                className={`quick-day-btn ${filterType === 'under' ? 'active' : ''}`}
                onClick={() => setFilterType('under')}
              >
                Underforecast ({underCount})
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search hour..."
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
                <th>Delivery Time (UTC)</th>
                <th>SP</th>
                <th>Forecast (MW)</th>
                <th>Actual Outturn (MW)</th>
                <th>Error (F - A)</th>
                <th>Absolute Error</th>
                <th>Percentage Error</th>
                <th>Selected Publish Time</th>
                <th>Lead Time</th>
                <th>Classification</th>
                <th>Vintages</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, i) => (
                <tr key={i}>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {r.delivery_time.slice(11, 16)} UTC
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {r.settlement_period || '-'}
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--forecast-color)' }}>
                    {r.forecast_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--actual-color)' }}>
                    {r.actual_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 700 }}>
                    <span
                      style={{
                        color: r.error_mw > 0 ? 'var(--overforecast-color)' : 'var(--underforecast-color)'
                      }}
                    >
                      {r.error_mw > 0 ? `+${r.error_mw}` : r.error_mw} MW
                    </span>
                  </td>
                  <td className="tabular-nums">
                    {r.abs_error_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums">
                    {r.percentage_error !== null ? `${r.percentage_error}%` : '<100 MW (Excl.)'}
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {r.publish_time.slice(11, 16)} UTC
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {r.lead_time_hours} hrs
                  </td>
                  <td>
                    <span className={`badge badge-${r.classification}`}>
                      {r.classification === 'overforecast' ? 'Overforecast (+)' : 'Underforecast (-)'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="quick-day-btn"
                      onClick={() => onInspectPeriod(r.delivery_time)}
                    >
                      Inspect
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
