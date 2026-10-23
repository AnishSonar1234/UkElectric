import React from 'react';
import { Wind, Clock, CheckCircle2, TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { EvaluationResponse } from '../types';
import { MetricCard } from '../components/MetricCard';
import { ForecastChart } from '../components/ForecastChart';

interface OverviewPageProps {
  data: EvaluationResponse | null;
  loading: boolean;
  error: string | null;
  onInspectPeriod: (deliveryTime: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  data,
  loading,
  error,
  onInspectPeriod
}) => {
  if (loading) {
    return (
      <div className="state-container">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Ingesting Elexon data and running day-ahead evaluation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-panel" style={{ borderColor: 'var(--error-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--error-color)', marginBottom: '0.5rem' }}>
          <AlertCircle size={20} />
          <strong style={{ fontSize: '1rem' }}>Data Ingestion Error</strong>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{error}</p>
      </div>
    );
  }

  if (!data || data.matched_records.length === 0) {
    return (
      <div className="state-container">
        <Wind size={36} color="var(--text-muted)" />
        <p style={{ color: 'var(--text-secondary)' }}>No matched records available for the selected dates.</p>
      </div>
    );
  }

  const { metrics, matched_records, summary_insight, decision_cutoff, delivery_date } = data;

  // Calculate high-level forecast statistics
  const forecastValues = matched_records.map((r) => r.forecast_mw);
  const actualValues = matched_records.map((r) => r.actual_mw);
  const peakForecast = Math.max(...forecastValues);
  const minForecast = Math.min(...forecastValues);
  const avgForecast = Math.round(forecastValues.reduce((a, b) => a + b, 0) / forecastValues.length);
  const peakActual = Math.max(...actualValues);

  return (
    <div>
      {/* Executive Summary Insight Banner */}
      <div className="insight-banner">
        <div style={{ color: 'var(--forecast-color)', marginTop: '2px' }}>
          <CheckCircle2 size={18} />
        </div>
        <div>
          <strong style={{ display: 'block', fontSize: '0.85rem', color: '#fff', marginBottom: '0.2rem' }}>
            Day-Ahead Procurement Executive Brief
          </strong>
          <div className="insight-text">{summary_insight}</div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={metrics.mae}
          unit="MW"
          subtitle="Typical forecast deviation"
          tone="info"
        />
        <MetricCard
          title="Root Mean Squared Error"
          value={metrics.rmse}
          unit="MW"
          subtitle="Penalizes extreme deviations"
          tone="default"
        />
        <MetricCard
          title="Forecast Bias"
          value={metrics.bias > 0 ? `+${metrics.bias}` : metrics.bias}
          unit="MW"
          subtitle={metrics.bias > 0 ? 'Overforecasting on average' : 'Underforecasting on average'}
          tone={metrics.bias > 0 ? 'overforecast' : 'underforecast'}
          badge={metrics.bias > 0 ? 'Overforecast' : 'Underforecast'}
        />
        <MetricCard
          title="MAPE Accuracy"
          value={metrics.mape !== null ? `${metrics.mape}%` : 'N/A'}
          subtitle={`Sample: ${metrics.mape_sample_size} periods (>=100 MW)`}
          tone="success"
        />
      </div>

      {/* Secondary Operational Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <MetricCard
          title="Peak Forecast Generation"
          value={peakForecast.toLocaleString()}
          unit="MW"
          subtitle={`Min: ${minForecast.toLocaleString()} MW | Actual Peak: ${peakActual.toLocaleString()} MW`}
          icon={<ArrowUpRight size={16} color="var(--forecast-color)" />}
        />
        <MetricCard
          title="Average Forecast Generation"
          value={avgForecast.toLocaleString()}
          unit="MW"
          subtitle="National wind average"
          icon={<Wind size={16} color="var(--actual-color)" />}
        />
        <MetricCard
          title="Decision Cutoff Enforced"
          value={decision_cutoff.slice(11, 19)}
          unit="UTC"
          subtitle={`Gate closure on ${data.decision_date}`}
          icon={<Clock size={16} color="var(--overforecast-color)" />}
        />
        <MetricCard
          title="Coverage Completeness"
          value={`${metrics.matched_count} / ${metrics.total_forecast_periods}`}
          unit="Periods"
          subtitle="Exact timestamp alignment"
          icon={<CheckCircle2 size={16} color="var(--actual-color)" />}
        />
      </div>

      {/* Main Delivery Day Forecast vs Actual Chart */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">
              <TrendingUp size={18} color="var(--forecast-color)" />
              National Wind Generation: Day-Ahead Forecast vs Outturn
            </div>
            <div className="panel-subtitle">
              Delivery Date: {delivery_date} | Selected forecast vintages prior to cutoff {decision_cutoff}
            </div>
          </div>
        </div>

        <ForecastChart data={matched_records} height={380} />
      </div>

      {/* Quick Delivery Periods Snapshot Table */}
      <div className="card-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Delivery Periods Summary</div>
            <div className="panel-subtitle">
              First 6 delivery periods. Click &quot;Inspect Vintages&quot; to review historical forecast progression.
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivery Time (UTC)</th>
                <th>Selected Forecast</th>
                <th>Actual Outturn</th>
                <th>Error (F - A)</th>
                <th>Publish Time</th>
                <th>Lead Time</th>
                <th>Classification</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {matched_records.slice(0, 6).map((r, i) => (
                <tr key={i}>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {r.delivery_time.slice(11, 16)} UTC
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--forecast-color)', fontWeight: 600 }}>
                    {r.forecast_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--actual-color)', fontWeight: 600 }}>
                    {r.actual_mw.toLocaleString()} MW
                  </td>
                  <td className="tabular-nums" style={{ fontWeight: 600 }}>
                    {r.error_mw > 0 ? `+${r.error_mw}` : r.error_mw} MW
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {r.publish_time.slice(11, 16)} UTC
                  </td>
                  <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {r.lead_time_hours}h
                  </td>
                  <td>
                    <span className={`badge badge-${r.classification}`}>
                      {r.classification === 'overforecast' ? 'Overforecast' : 'Underforecast'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="quick-day-btn"
                      onClick={() => onInspectPeriod(r.delivery_time)}
                      title="Inspect all published vintages for this period"
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
