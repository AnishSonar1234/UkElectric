from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class HealthResponse(BaseModel):
    status: str
    version: str
    upstream_elexon_reachable: bool
    upstream_status_code: Optional[int] = None
    cache_entries_count: int = 0
    message: str


class ActualGenerationRecord(BaseModel):
    dataset: str = "FUELHH"
    startTime: str = Field(..., description="Delivery period start timestamp in UTC (ISO 8601)")
    settlementDate: str = Field(..., description="Settlement date (YYYY-MM-DD)")
    settlementPeriod: int = Field(..., description="Settlement period (1-48/50)")
    fuelType: str = "WIND"
    generation: float = Field(..., description="Actual national wind generation outturn in MW")


class ForecastRecord(BaseModel):
    dataset: str = "WINDFOR"
    startTime: str = Field(..., description="Delivery period start timestamp in UTC (ISO 8601)")
    publishTime: str = Field(..., description="Forecast publication timestamp in UTC (ISO 8601)")
    generation: float = Field(..., description="Forecast wind generation in MW")


class MatchedDeliveryPeriod(BaseModel):
    delivery_time: str = Field(..., description="Delivery period start time (UTC ISO 8601)")
    settlement_period: Optional[int] = Field(None, description="Settlement period number (1-48)")
    forecast_mw: float = Field(..., description="Forecast generation in MW")
    actual_mw: float = Field(..., description="Actual generation in MW")
    error_mw: float = Field(..., description="Forecast error in MW: Forecast - Actual (positive=overforecast, negative=underforecast)")
    abs_error_mw: float = Field(..., description="Absolute forecast error in MW: |Forecast - Actual|")
    percentage_error: Optional[float] = Field(None, description="Absolute percentage error: (|F - A| / A) * 100")
    publish_time: str = Field(..., description="Publication timestamp of the selected forecast")
    lead_time_hours: float = Field(..., description="Forecast lead time in hours (delivery_time - publish_time)")
    classification: str = Field(..., description="'overforecast' | 'underforecast' | 'exact'")


class VintageItem(BaseModel):
    startTime: str
    publishTime: str
    generation: float
    is_eligible: bool
    is_selected: bool
    lead_time_hours: float


class AccuracyMetrics(BaseModel):
    mae: float = Field(..., description="Mean Absolute Error in MW: mean(|F - A|)")
    rmse: float = Field(..., description="Root Mean Squared Error in MW: sqrt(mean((F - A)^2))")
    bias: float = Field(..., description="Mean Forecast Bias in MW: mean(F - A). Positive = overforecast, Negative = underforecast")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%). Excludes actuals below threshold.")
    mape_sample_size: int = Field(..., description="Number of observations included in MAPE calculation")
    mape_threshold_mw: float = Field(..., description="Cutoff threshold in MW below which actuals are excluded from MAPE")
    
    # Counts & completeness
    matched_count: int = Field(..., description="Number of periods with both valid forecast and actual")
    total_actual_periods: int = Field(..., description="Total actual generation periods returned by Elexon for delivery date")
    total_forecast_periods: int = Field(..., description="Total unique forecast periods for delivery date")
    unmatched_actual_count: int = Field(..., description="Actuals with no matching forecast at this resolution")
    
    # Context
    decision_date: str = Field(..., description="Decision date (YYYY-MM-DD)")
    delivery_date: str = Field(..., description="Delivery date (YYYY-MM-DD)")
    decision_cutoff: str = Field(..., description="Decision cutoff timestamp (UTC ISO 8601)")
    min_lead_time_hours: Optional[float] = None
    max_lead_time_hours: Optional[float] = None
    avg_lead_time_hours: Optional[float] = None
    units: str = "MW"


class EvaluationResponse(BaseModel):
    decision_date: str
    delivery_date: str
    decision_cutoff: str
    units: str = "MW"
    metrics: AccuracyMetrics
    matched_records: List[MatchedDeliveryPeriod]
    summary_insight: str


class VintagesResponse(BaseModel):
    delivery_time: str
    decision_cutoff: str
    vintages: List[VintageItem]


class MethodologyResponse(BaseModel):
    title: str
    data_sources: Dict[str, Any]
    market_rules: Dict[str, Any]
    forecast_selection_algorithm: Dict[str, Any]
    metrics_definitions: Dict[str, Any]
    handling_rules: Dict[str, Any]
    limitations: List[str]
