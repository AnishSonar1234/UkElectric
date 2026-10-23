import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { OverviewPage } from './pages/OverviewPage';
import { ForecastsPage } from './pages/ForecastsPage';
import { AccuracyPage } from './pages/AccuracyPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { VintageModal } from './components/VintageModal';
import { apiService } from './services/api';
import type { EvaluationResponse } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'forecasts' | 'accuracy' | 'methodology'>('overview');
  const [decisionDate, setDecisionDate] = useState<string>('2026-01-15');
  const [cutoffTime, setCutoffTime] = useState<string>('11:00:00');
  
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [upstreamConnected, setUpstreamConnected] = useState<boolean>(true);
  const [cacheCount, setCacheCount] = useState<number>(0);
  
  const [selectedVintagePeriod, setSelectedVintagePeriod] = useState<string | null>(null);

  // Calculate day D = decisionDate + 1 day
  const calculateDeliveryDate = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day));
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    } catch {
      return '2026-01-16';
    }
  };

  const deliveryDate = calculateDeliveryDate(decisionDate);

  // Health check on mount and interval
  const checkHealth = useCallback(async () => {
    try {
      const h = await apiService.getHealth();
      setUpstreamConnected(h.upstream_elexon_reachable);
      setCacheCount(h.cache_entries_count);
    } catch {
      setUpstreamConnected(false);
    }
  }, []);

  // Fetch evaluation data
  const loadEvaluation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getEvaluation(decisionDate, deliveryDate, cutoffTime);
      setEvaluationData(res);
      // Update cache count
      checkHealth();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch evaluation from backend.');
    } finally {
      setLoading(false);
    }
  }, [decisionDate, deliveryDate, cutoffTime, checkHealth]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        upstreamConnected={upstreamConnected}
        cacheCount={cacheCount}
      />

      <main className="main-content">
        <FilterBar
          decisionDate={decisionDate}
          setDecisionDate={setDecisionDate}
          deliveryDate={deliveryDate}
          cutoffTime={cutoffTime}
          setCutoffTime={setCutoffTime}
          onRefresh={loadEvaluation}
          loading={loading}
        />

        {activeTab === 'overview' && (
          <OverviewPage
            data={evaluationData}
            loading={loading}
            error={error}
            onInspectPeriod={(period) => setSelectedVintagePeriod(period)}
          />
        )}

        {activeTab === 'forecasts' && (
          <ForecastsPage
            data={evaluationData}
            loading={loading}
            error={error}
            onInspectPeriod={(period) => setSelectedVintagePeriod(period)}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyPage
            data={evaluationData}
            loading={loading}
            error={error}
            onInspectPeriod={(period) => setSelectedVintagePeriod(period)}
          />
        )}

        {activeTab === 'methodology' && <MethodologyPage />}
      </main>

      {/* Forecast Vintage Modal */}
      {selectedVintagePeriod && (
        <VintageModal
          deliveryTime={selectedVintagePeriod}
          decisionDate={decisionDate}
          cutoffTime={cutoffTime}
          onClose={() => setSelectedVintagePeriod(null)}
        />
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem 2rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          background: 'var(--bg-surface)'
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>WindSight Analytics MVP</strong> — Decision Support for UK Day-Ahead Electricity Procurement.
          </div>
          <div>
            Data Sources: Official Elexon BMRS (<code style={{ color: 'var(--actual-color)' }}>FUELHH</code> &amp; <code style={{ color: 'var(--forecast-color)' }}>WINDFOR</code>). Does not place automated trades.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
