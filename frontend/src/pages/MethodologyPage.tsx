import React from 'react';
import { BookOpen, Database, Clock, Calculator, AlertTriangle, ShieldCheck } from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div>
      {/* Title & Overview */}
      <div className="card-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <BookOpen size={24} color="var(--forecast-color)" />
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              Methodology &amp; Market Architecture
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Comprehensive documentation of data sources, auction gate closures, deterministic forecast selection, and statistical metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Methodology Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Data Sources */}
        <div className="card-panel">
          <div className="panel-title" style={{ marginBottom: '1rem' }}>
            <Database size={18} color="var(--actual-color)" />
            Official Elexon Data Sources
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 600, color: 'var(--actual-color)', marginBottom: '0.25rem' }}>
                Actual Generation — FUELHH Stream
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Endpoint: <code style={{ color: '#fff', fontSize: '0.75rem' }}>/datasets/FUELHH/stream</code>
              </p>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>Half-hourly national generation outturn in Megawatts (MW).</li>
                <li>Strictly filtered by <code style={{ color: '#fff' }}>fuelType = &apos;WIND&apos;</code>.</li>
                <li>Provides 48 settlement periods per standard calendar day.</li>
              </ul>
            </div>

            <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontWeight: 600, color: 'var(--forecast-color)', marginBottom: '0.25rem' }}>
                Forecast Generation — WINDFOR Stream
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Endpoint: <code style={{ color: '#fff', fontSize: '0.75rem' }}>/datasets/WINDFOR/stream</code>
              </p>
              <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                <li>National wind power forecast in Megawatts (MW) published multi-times daily.</li>
                <li>Provides hourly delivery timestamps across a forward 72-hour horizon.</li>
                <li>Fields utilized: <code style={{ color: '#fff' }}>startTime</code>, <code style={{ color: '#fff' }}>publishTime</code>, <code style={{ color: '#fff' }}>generation</code>.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 2: Decision Cutoff & Market Rules */}
        <div className="card-panel">
          <div className="panel-title" style={{ marginBottom: '1rem' }}>
            <Clock size={18} color="var(--overforecast-color)" />
            UK Day-Ahead Market Timing &amp; Cutoffs
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              In the Great Britain electricity market, wholesale day-ahead power is procured via power exchange auctions (primarily <strong>EPEX SPOT GB Day-Ahead Auction</strong> and <strong>Nord Pool N2EX</strong>).
            </p>
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.35rem' }}>
                Auction Order Book Gate Closure: 11:00 UTC (GMT)
              </div>
              <p style={{ color: 'var(--text-muted)' }}>
                On day D-1, procurement bids must be submitted before 11:00 UTC for physical delivery across day D. Consequently, <strong>11:00:00 UTC</strong> is the default decision cutoff. Any forecast published after 11:00 UTC was unavailable at decision time.
              </p>
            </div>
            <p>
              <strong>Date-Window Semantics:</strong> A purchasing decision on January 31 concerns electricity delivery on February 1. The platform automatically aligns the evaluation window to evaluate February 1 delivery using only January 31 pre-cutoff forecasts.
            </p>
          </div>
        </div>

        {/* Card 3: Deterministic Selection Algorithm */}
        <div className="card-panel">
          <div className="panel-title" style={{ marginBottom: '1rem' }}>
            <ShieldCheck size={18} color="var(--actual-color)" />
            Historical Forecast Selection Algorithm
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Multiple forecast vintages exist for each delivery period. To guarantee strict real-world fidelity without look-ahead bias:
            </p>
            <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <li>
                <strong style={{ color: '#fff' }}>Identify Candidate Vintages:</strong> Ingest all WINDFOR forecast runs published in the 48-hour window preceding delivery.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Eliminate Post-Cutoff Vintages:</strong> Discard any record with <code style={{ color: '#fff' }}>publishTime &gt; decision_cutoff</code>.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Select Latest Eligible:</strong> For each delivery period (<code style={{ color: '#fff' }}>startTime</code>), deterministically select the record with <code style={{ color: '#fff' }}>max(publishTime) &le; decision_cutoff</code>.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Preserve Audit Trail:</strong> Retain the exact publication timestamp and calculate forecast lead time in decimal hours.
              </li>
              <li>
                <strong style={{ color: '#fff' }}>Exact Timestamp Match:</strong> Match selected forecasts with FUELHH actuals on identical <code style={{ color: '#fff' }}>startTime</code>.
              </li>
            </ol>
          </div>
        </div>

        {/* Card 4: Statistical Metric Formulas */}
        <div className="card-panel">
          <div className="panel-title" style={{ marginBottom: '1rem' }}>
            <Calculator size={18} color="var(--forecast-color)" />
            Statistical Accuracy Metrics
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <strong style={{ color: '#fff' }}>Mean Absolute Error (MAE):</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--forecast-color)', margin: '0.2rem 0' }}>
                MAE = (1 / N) * &Sigma; |Forecast - Actual|
              </div>
              <span style={{ color: 'var(--text-muted)' }}>Represents typical magnitude of forecast deviation in MW.</span>
            </div>

            <div>
              <strong style={{ color: '#fff' }}>Root Mean Squared Error (RMSE):</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--forecast-color)', margin: '0.2rem 0' }}>
                RMSE = &radic;((1 / N) * &Sigma; (Forecast - Actual)&sup2;)
              </div>
              <span style={{ color: 'var(--text-muted)' }}>Penalizes large errors heavily; vital for utility reserve procurement.</span>
            </div>

            <div>
              <strong style={{ color: '#fff' }}>Mean Forecast Bias:</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--forecast-color)', margin: '0.2rem 0' }}>
                Bias = (1 / N) * &Sigma; (Forecast - Actual)
              </div>
              <span style={{ color: 'var(--text-muted)' }}>Positive = overforecasting; Negative = underforecasting.</span>
            </div>

            <div>
              <strong style={{ color: '#fff' }}>Mean Absolute Percentage Error (MAPE):</strong>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--forecast-color)', margin: '0.2rem 0' }}>
                MAPE = (1 / K) * &Sigma; (|Forecast - Actual| / Actual) * 100
              </div>
              <span style={{ color: 'var(--text-muted)' }}>
                Actuals &lt; 100 MW are excluded to avoid mathematical explosion during calm periods.
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Missing Data and Limitations Panel */}
      <div className="card-panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-title" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} color="var(--overforecast-color)" />
          Data Integrity Rules &amp; Operational Limitations
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.25rem', fontSize: '0.85rem' }}>
          <div>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.35rem' }}>
              Zero-Tolerance Data Engineering Rules:
            </strong>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Never silently replace missing values with zero.</li>
              <li>Never treat missing actuals as zero generation.</li>
              <li>Do not compare unmatched records; report valid sample size explicitly.</li>
              <li>Elexon WINDFOR provides hourly resolution (:00); FUELHH provides half-hourly (:00 and :30). Only identical :00 timestamps are matched.</li>
            </ul>
          </div>

          <div>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '0.35rem' }}>
              Decision-Support Platform Boundaries:
            </strong>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>This platform does not automatically place wholesale market trades.</li>
              <li>Does not calculate total net utility demand position (which requires consumer load profiles).</li>
              <li>Covers national wind generation across Great Britain; transmission constraints or local curtailments are not reflected.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
