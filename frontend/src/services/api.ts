import type {
  EvaluationResponse,
  ForecastsResponse,
  ActualsResponse,
  VintagesResponse,
  MethodologyResponse,
  HealthResponse,
  AccuracyMetrics
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' 
          ? errorJson.detail 
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const apiService = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async getActuals(deliveryDate: string): Promise<ActualsResponse> {
    const params = new URLSearchParams({ delivery_date: deliveryDate });
    const res = await fetch(`${API_BASE}/actuals?${params.toString()}`);
    return handleResponse<ActualsResponse>(res);
  },

  async getForecasts(
    decisionDate: string,
    deliveryDate?: string,
    cutoffTime: string = '11:00:00'
  ): Promise<ForecastsResponse> {
    const params = new URLSearchParams({
      decision_date: decisionDate,
      cutoff_time: cutoffTime
    });
    if (deliveryDate) {
      params.append('delivery_date', deliveryDate);
    }
    const res = await fetch(`${API_BASE}/forecasts?${params.toString()}`);
    return handleResponse<ForecastsResponse>(res);
  },

  async getEvaluation(
    decisionDate: string,
    deliveryDate?: string,
    cutoffTime: string = '11:00:00',
    mapeThreshold: number = 100.0
  ): Promise<EvaluationResponse> {
    const params = new URLSearchParams({
      decision_date: decisionDate,
      cutoff_time: cutoffTime,
      mape_threshold_mw: mapeThreshold.toString()
    });
    if (deliveryDate) {
      params.append('delivery_date', deliveryDate);
    }
    const res = await fetch(`${API_BASE}/evaluation?${params.toString()}`);
    return handleResponse<EvaluationResponse>(res);
  },

  async getAccuracy(
    decisionDate: string,
    deliveryDate?: string,
    cutoffTime: string = '11:00:00',
    mapeThreshold: number = 100.0
  ): Promise<AccuracyMetrics> {
    const params = new URLSearchParams({
      decision_date: decisionDate,
      cutoff_time: cutoffTime,
      mape_threshold_mw: mapeThreshold.toString()
    });
    if (deliveryDate) {
      params.append('delivery_date', deliveryDate);
    }
    const res = await fetch(`${API_BASE}/accuracy?${params.toString()}`);
    return handleResponse<AccuracyMetrics>(res);
  },

  async getVintages(
    deliveryTime: string,
    decisionDate: string,
    cutoffTime: string = '11:00:00'
  ): Promise<VintagesResponse> {
    const params = new URLSearchParams({
      delivery_time: deliveryTime,
      decision_date: decisionDate,
      cutoff_time: cutoffTime
    });
    const res = await fetch(`${API_BASE}/vintages?${params.toString()}`);
    return handleResponse<VintagesResponse>(res);
  },

  async getMethodology(): Promise<MethodologyResponse> {
    const res = await fetch(`${API_BASE}/methodology`);
    return handleResponse<MethodologyResponse>(res);
  }
};
