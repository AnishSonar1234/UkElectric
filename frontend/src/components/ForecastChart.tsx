import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type { MatchedDeliveryPeriod } from '../types';

interface ForecastChartProps {
  data: MatchedDeliveryPeriod[];
  height?: number;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data, height = 360 }) => {
  const [showForecast, setShowForecast] = useState(true);
  const [showActual, setShowActual] = useState(true);

  // Format data for chart
  const chartData = data.map((item) => {
    const timeLabel = item.delivery_time.slice(11, 16);
    return {
      time: timeLabel,
      fullTime: item.delivery_time,
      forecast: item.forecast_mw,
      actual: item.actual_mw,
      error: item.error_mw,
      publishTime: item.publish_time,
      leadTime: item.lead_time_hours
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      return (
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1rem',
            boxShadow: 'var(--shadow-md)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ fontWeight: 600, borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
            Delivery: {pData.fullTime} UTC
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span style={{ color: 'var(--forecast-color)' }}>● Selected Forecast:</span>
              <strong className="tabular-nums">{pData.forecast?.toLocaleString()} MW</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <span style={{ color: 'var(--actual-color)' }}>● Actual Outturn:</span>
              <strong className="tabular-nums">{pData.actual?.toLocaleString()} MW</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.35rem' }}>
              <span style={{ color: pData.error > 0 ? 'var(--overforecast-color)' : 'var(--underforecast-color)' }}>
                Error (F - A):
              </span>
              <strong className="tabular-nums">
                {pData.error > 0 ? `+${pData.error?.toLocaleString()}` : pData.error?.toLocaleString()} MW
              </strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Published: {pData.publishTime.slice(11, 16)} UTC (Lead: {pData.leadTime}h)
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setShowForecast(!showForecast)}
          style={{
            background: showForecast ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface-elevated)',
            border: `1px solid ${showForecast ? 'var(--forecast-color)' : 'var(--border-subtle)'}`,
            color: showForecast ? 'var(--forecast-color)' : 'var(--text-muted)',
            padding: '0.25rem 0.65rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ● Day-Ahead Forecast (WINDFOR)
        </button>
        <button
          onClick={() => setShowActual(!showActual)}
          style={{
            background: showActual ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-elevated)',
            border: `1px solid ${showActual ? 'var(--actual-color)' : 'var(--border-subtle)'}`,
            color: showActual ? 'var(--actual-color)' : 'var(--text-muted)',
            padding: '0.25rem 0.65rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ● Actual Generation (FUELHH)
        </button>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              unit=" MW"
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {showForecast && (
              <Area
                type="monotone"
                dataKey="forecast"
                name="Forecast (MW)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#forecastGradient)"
              />
            )}
            {showActual && (
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual (MW)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#actualGradient)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
