import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import type { MatchedDeliveryPeriod } from '../types';

interface ErrorChartProps {
  data: MatchedDeliveryPeriod[];
  height?: number;
}

export const ErrorChart: React.FC<ErrorChartProps> = ({ data, height = 300 }) => {
  const chartData = data.map((item) => ({
    time: item.delivery_time.slice(11, 16),
    fullTime: item.delivery_time,
    error: item.error_mw,
    absError: item.abs_error_mw,
    pctError: item.percentage_error,
    classification: item.classification
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const isOver = p.error > 0;
      return (
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.75rem 1rem',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
            Period: {p.fullTime.slice(11, 16)} UTC
          </div>
          <div>
            Error (F - A):{' '}
            <strong
              className="tabular-nums"
              style={{ color: isOver ? 'var(--overforecast-color)' : 'var(--underforecast-color)' }}
            >
              {isOver ? `+${p.error} MW` : `${p.error} MW`}
            </strong>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
            Magnitude: {p.absError} MW {p.pctError !== null && `(${p.pctError}%)`}
          </div>
          <div style={{ marginTop: '0.35rem' }}>
            <span className={`badge badge-${p.classification}`}>
              {p.classification === 'overforecast' ? 'Overforecast (+)' : 'Underforecast (-)'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit=" MW" />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
          <Bar dataKey="error" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.error >= 0 ? 'var(--overforecast-color)' : 'var(--underforecast-color)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
