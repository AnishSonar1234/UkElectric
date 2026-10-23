import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Clock, Layers } from 'lucide-react';
import { apiService } from '../services/api';
import type { VintageItem } from '../types';

interface VintageModalProps {
  deliveryTime: string;
  decisionDate: string;
  cutoffTime: string;
  onClose: () => void;
}

export const VintageModal: React.FC<VintageModalProps> = ({
  deliveryTime,
  decisionDate,
  cutoffTime,
  onClose
}) => {
  const [vintages, setVintages] = useState<VintageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVintages() {
      setLoading(true);
      setError(null);
      try {
        const resp = await apiService.getVintages(deliveryTime, decisionDate, cutoffTime);
        setVintages(resp.vintages);
      } catch (err: any) {
        setError(err.message || 'Failed to load vintages.');
      } finally {
        setLoading(false);
      }
    }
    loadVintages();
  }, [deliveryTime, decisionDate, cutoffTime]);

  const decisionCutoffIso = `${decisionDate}T${cutoffTime}Z`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Layers size={20} color="var(--forecast-color)" />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Forecast Vintage Inspection
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Delivery Period: <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{deliveryTime} UTC</span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Explanation Alert */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#fff', fontWeight: 600 }}>
              <Clock size={14} color="var(--forecast-color)" />
              Decision Cutoff: <span className="tabular-nums">{decisionCutoffIso}</span>
            </div>
            Forecasts published after this cutoff are strictly discarded to eliminate look-ahead bias.
            The procurement team deterministically selects the latest eligible forecast issued prior to market gate closure.
          </div>

          {loading ? (
            <div className="state-container">
              <div className="spinner" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Loading published vintages from Elexon...
              </span>
            </div>
          ) : error ? (
            <div className="state-container" style={{ color: 'var(--error-color)' }}>
              <AlertTriangle size={24} />
              <span>{error}</span>
            </div>
          ) : vintages.length === 0 ? (
            <div className="state-container">
              <span style={{ color: 'var(--text-muted)' }}>No candidate vintages found for this period.</span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Publication Time (UTC)</th>
                    <th>Forecast Generation</th>
                    <th>Lead Time</th>
                    <th>Eligibility Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vintages.map((v, i) => {
                    return (
                      <tr
                        key={i}
                        style={{
                          background: v.is_selected
                            ? 'rgba(56, 189, 248, 0.12)'
                            : !v.is_eligible
                            ? 'rgba(244, 63, 94, 0.05)'
                            : undefined
                        }}
                      >
                        <td className="tabular-nums" style={{ fontWeight: v.is_selected ? 600 : 400 }}>
                          {v.publishTime}
                        </td>
                        <td className="tabular-nums" style={{ fontWeight: 600, color: v.is_selected ? 'var(--forecast-color)' : 'var(--text-primary)' }}>
                          {v.generation.toLocaleString()} MW
                        </td>
                        <td className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {v.lead_time_hours} hrs
                        </td>
                        <td>
                          {v.is_selected ? (
                            <span className="badge badge-info" style={{ fontWeight: 700 }}>
                              <CheckCircle2 size={12} />
                              Selected (Latest Eligible)
                            </span>
                          ) : v.is_eligible ? (
                            <span className="badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
                              Eligible (Superseded)
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'var(--error-color)', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                              Excluded (Post-Cutoff)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
