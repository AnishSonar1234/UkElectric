import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'overforecast' | 'underforecast' | 'success' | 'info';
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  tone = 'default',
  badge
}) => {
  let valueColor = 'var(--text-primary)';
  if (tone === 'overforecast') valueColor = 'var(--overforecast-color)';
  if (tone === 'underforecast') valueColor = 'var(--underforecast-color)';
  if (tone === 'success') valueColor = 'var(--actual-color)';
  if (tone === 'info') valueColor = 'var(--forecast-color)';

  return (
    <div className="metric-card">
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {icon && <div className="metric-icon-wrap">{icon}</div>}
      </div>

      <div className="metric-value-wrap">
        <span className="metric-value tabular-nums" style={{ color: valueColor }}>
          {value}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem' }}>
        {subtitle && <span className="metric-subtitle">{subtitle}</span>}
        {badge && (
          <span className={`badge badge-${tone}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
