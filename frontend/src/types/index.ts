export interface MatchedDeliveryPeriod {
  delivery_time: string;
  settlement_period?: number | null;
  forecast_mw: number;
  actual_mw: number;
  error_mw: number;
  abs_error_mw: number;
  percentage_error?: number | null;
  publish_time: string;
  lead_time_hours: number;
  classification: 'overforecast' | 'underforecast' | 'exact';
}

export interface AccuracyMetrics {
  mae: number;
  rmse: number;
  bias: number;
  mape?: number | null;
  mape_sample_size: number;
  mape_threshold_mw: number;
  matched_count: number;
  total_actual_periods: number;
  total_forecast_periods: number;
  unmatched_actual_count: number;
  decision_date: string;
  delivery_date: string;
  decision_cutoff: string;
  min_lead_time_hours?: number | null;
  max_lead_time_hours?: number | null;
  avg_lead_time_hours?: number | null;
  units: string;
}

export interface EvaluationResponse {
  decision_date: string;
  delivery_date: string;
  decision_cutoff: string;
  units: string;
  metrics: AccuracyMetrics;
  matched_records: MatchedDeliveryPeriod[];
  summary_insight: string;
}

export interface ForecastRecord {
  startTime: string;
  publishTime: string;
  generation: number;
  units?: string;
}

export interface ForecastsResponse {
  decision_date: string;
  delivery_date: string;
  decision_cutoff: string;
  count: number;
  units: string;
  records: ForecastRecord[];
}

export interface ActualGenerationRecord {
  dataset: string;
  startTime: string;
  settlementDate: string;
  settlementPeriod: number;
  fuelType: string;
  generation: number;
}

export interface ActualsResponse {
  delivery_date: string;
  dataset: string;
  fuelType: string;
  count: number;
  units: string;
  records: ActualGenerationRecord[];
}

export interface VintageItem {
  startTime: string;
  publishTime: string;
  generation: number;
  is_eligible: boolean;
  is_selected: boolean;
  lead_time_hours: number;
}

export interface VintagesResponse {
  delivery_time: string;
  decision_cutoff: string;
  vintages: VintageItem[];
}

export interface MethodologyResponse {
  title: string;
  data_sources: {
    actual_generation: {
      dataset: string;
      endpoint: string;
      filter: string;
      resolution: string;
      units: string;
      description: string;
    };
    forecast_generation: {
      dataset: string;
      endpoint: string;
      fields: string[];
      resolution: string;
      units: string;
      description: string;
    };
  };
  market_rules: {
    day_ahead_market: string;
    decision_date: string;
    decision_cutoff: string;
    delivery_date: string;
    month_boundary_handling: string;
  };
  forecast_selection_algorithm: Record<string, string>;
  metrics_definitions: Record<string, string>;
  handling_rules: Record<string, string>;
  limitations: string[];
}

export interface HealthResponse {
  status: string;
  version: string;
  upstream_elexon_reachable: boolean;
  upstream_status_code?: number | null;
  cache_entries_count: number;
  message: string;
}
