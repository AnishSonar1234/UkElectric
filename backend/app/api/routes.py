from fastapi import APIRouter, Query, HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.core.config import settings
from app.services.elexon_client import elexon_client
from app.services.forecast_service import forecast_service
from app.services.cache_service import cache_service
from app.schemas.models import (
    HealthResponse,
    EvaluationResponse,
    AccuracyMetrics,
    VintagesResponse,
    MethodologyResponse
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Checks backend health and actively verifies reachability of upstream Elexon BMRS API.
    Does not falsely claim health without checking upstream status.
    """
    is_reachable, status_code, msg = await elexon_client.check_health()
    return HealthResponse(
        status="healthy" if is_reachable else "degraded",
        version=settings.VERSION,
        upstream_elexon_reachable=is_reachable,
        upstream_status_code=status_code,
        cache_entries_count=cache_service.count(),
        message=msg
    )


@router.get("/actuals")
async def get_actuals(
    delivery_date: str = Query(..., description="Target delivery date (YYYY-MM-DD)")
):
    """
    Retrieves actual national wind generation outturn (FUELHH) for the given delivery date.
    Strictly filters for fuelType = WIND.
    """
    try:
        datetime.strptime(delivery_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid delivery_date format. Expected YYYY-MM-DD."
        )

    try:
        actuals = await elexon_client.fetch_actual_generation(
            settlement_date_from=delivery_date,
            settlement_date_to=delivery_date
        )
        return {
            "delivery_date": delivery_date,
            "dataset": "FUELHH",
            "fuelType": "WIND",
            "count": len(actuals),
            "units": "MW",
            "records": actuals
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch actual generation from Elexon: {str(e)}"
        )


@router.get("/forecasts")
async def get_forecasts(
    decision_date: str = Query(..., description="Decision date (YYYY-MM-DD)"),
    delivery_date: Optional[str] = Query(None, description="Delivery date (YYYY-MM-DD, defaults to decision_date + 1)"),
    cutoff_time: str = Query("11:00:00", description="Decision cutoff time in UTC (HH:MM:SS)")
):
    """
    Retrieves the latest eligible wind forecasts (WINDFOR) for each delivery period of the target delivery date,
    strictly excluding any forecast vintages published after the decision cutoff.
    """
    try:
        dec_dt = datetime.strptime(decision_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid decision_date format. Expected YYYY-MM-DD."
        )

    target_delivery = delivery_date or (dec_dt + timedelta(days=1)).strftime("%Y-%m-%d")
    decision_cutoff_iso = f"{decision_date}T{cutoff_time}Z"

    pub_from = f"{(dec_dt - timedelta(days=1)).strftime('%Y-%m-%d')}T00:00:00Z"
    pub_to = f"{decision_date}T23:59:59Z"

    try:
        forecast_records = await elexon_client.fetch_wind_forecasts(
            publish_datetime_from=pub_from,
            publish_datetime_to=pub_to
        )
        selected_forecasts = forecast_service.select_latest_eligible_forecasts(
            forecast_records=forecast_records,
            decision_cutoff_iso=decision_cutoff_iso,
            target_delivery_date=target_delivery
        )

        records_list = [
            {
                "startTime": st,
                "publishTime": fc["publishTime"],
                "generation": fc["generation"],
                "units": "MW"
            }
            for st, fc in sorted(selected_forecasts.items())
        ]

        return {
            "decision_date": decision_date,
            "delivery_date": target_delivery,
            "decision_cutoff": decision_cutoff_iso,
            "count": len(records_list),
            "units": "MW",
            "records": records_list
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch forecast records from Elexon: {str(e)}"
        )


@router.get("/evaluation", response_model=EvaluationResponse)
async def get_evaluation(
    decision_date: str = Query(..., description="Decision date (YYYY-MM-DD)"),
    delivery_date: Optional[str] = Query(None, description="Delivery date (YYYY-MM-DD, defaults to decision_date + 1)"),
    cutoff_time: str = Query("11:00:00", description="Decision cutoff time in UTC (HH:MM:SS)"),
    mape_threshold_mw: float = Query(100.0, description="Minimum actual generation in MW to include in MAPE")
):
    """
    Executes full evaluation:
    - Ingests FUELHH wind actuals and WINDFOR forecast vintages.
    - Selects the latest eligible forecast published on or before decision cutoff.
    - Matches observations on exact delivery period.
    - Calculates MAE, RMSE, Bias, and MAPE.
    - Categorizes overforecasting vs underforecasting.
    """
    try:
        datetime.strptime(decision_date, "%Y-%m-%d")
        if delivery_date:
            datetime.strptime(delivery_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD."
        )

    try:
        result = await forecast_service.evaluate_forecast_accuracy(
            decision_date=decision_date,
            cutoff_time=cutoff_time,
            delivery_date=delivery_date,
            mape_threshold_mw=mape_threshold_mw
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to compute evaluation: {str(e)}"
        )


@router.get("/accuracy", response_model=AccuracyMetrics)
async def get_accuracy(
    decision_date: str = Query(..., description="Decision date (YYYY-MM-DD)"),
    delivery_date: Optional[str] = Query(None, description="Delivery date (YYYY-MM-DD, defaults to decision_date + 1)"),
    cutoff_time: str = Query("11:00:00", description="Decision cutoff time in UTC (HH:MM:SS)"),
    mape_threshold_mw: float = Query(100.0, description="Minimum actual generation in MW to include in MAPE")
):
    """
    Returns only the statistical accuracy metrics (MAE, RMSE, Bias, MAPE) and metadata for the specified evaluation.
    """
    eval_result = await get_evaluation(
        decision_date=decision_date,
        delivery_date=delivery_date,
        cutoff_time=cutoff_time,
        mape_threshold_mw=mape_threshold_mw
    )
    return eval_result.metrics


@router.get("/vintages", response_model=VintagesResponse)
async def get_vintages(
    delivery_time: str = Query(..., description="Target delivery period ISO string (e.g. 2026-01-16T12:00:00Z)"),
    decision_date: str = Query(..., description="Decision date (YYYY-MM-DD)"),
    cutoff_time: str = Query("11:00:00", description="Decision cutoff time in UTC (HH:MM:SS)")
):
    """
    Returns all published forecast vintages for a specific delivery period,
    annotating which were published before vs after cutoff and which was selected.
    """
    try:
        dec_dt = datetime.strptime(decision_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid decision_date format. Expected YYYY-MM-DD."
        )

    decision_cutoff_iso = f"{decision_date}T{cutoff_time}Z"
    pub_from = f"{(dec_dt - timedelta(days=2)).strftime('%Y-%m-%d')}T00:00:00Z"
    pub_to = f"{(dec_dt + timedelta(days=1)).strftime('%Y-%m-%d')}T23:59:59Z"

    try:
        records = await elexon_client.fetch_wind_forecasts(
            publish_datetime_from=pub_from,
            publish_datetime_to=pub_to
        )
        vintages = forecast_service.extract_vintages_for_delivery_period(
            forecast_records=records,
            delivery_time_iso=delivery_time,
            decision_cutoff_iso=decision_cutoff_iso
        )
        return VintagesResponse(
            delivery_time=delivery_time,
            decision_cutoff=decision_cutoff_iso,
            vintages=vintages
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch vintages: {str(e)}"
        )


@router.get("/methodology", response_model=MethodologyResponse)
async def get_methodology():
    """
    Provides comprehensive documentation of data sources, market rules, forecast selection logic,
    statistical metrics formulas, missing data handling, and operational limitations.
    """
    return MethodologyResponse(
        title="WindSight Analytics — UK Day-Ahead Wind Forecast Evaluation Methodology",
        data_sources={
            "actual_generation": {
                "dataset": "FUELHH",
                "endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream",
                "filter": "fuelType = 'WIND'",
                "resolution": "Half-hourly (48 settlement periods per standard day)",
                "units": "Megawatts (MW)",
                "description": "Half-hourly outturn generation by fuel type from the Balancing Mechanism Reporting Service (BMRS)."
            },
            "forecast_generation": {
                "dataset": "WINDFOR",
                "endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream",
                "fields": ["startTime", "publishTime", "generation"],
                "resolution": "Hourly delivery periods across a forward 72-hour horizon",
                "units": "Megawatts (MW)",
                "description": "National wind generation forecast published multiple times daily by National Grid ESO / Elexon."
            }
        },
        market_rules={
            "day_ahead_market": "In Great Britain, day-ahead wholesale electricity power exchange auctions (EPEX SPOT and Nord Pool N2EX) close order books at 11:00 UTC (GMT) on day D-1.",
            "decision_date": "The date on which day-ahead power procurement bids are submitted (D-1).",
            "decision_cutoff": "The strict cutoff time (default 11:00:00 UTC) representing the latest forecast information available to traders at auction submission.",
            "delivery_date": "The calendar date on which electricity is physically delivered (Day D = Decision Date + 1 day).",
            "month_boundary_handling": "A purchasing decision made on January 31 concerns delivery on February 1. The platform automatically shifts to February 1 delivery while preserving the January 31 decision cutoff."
        },
        forecast_selection_algorithm={
            "step_1": "Query all WINDFOR forecast vintages published in the candidate window preceding delivery.",
            "step_2": "Filter candidates for the target delivery date (startTime).",
            "step_3_cutoff_filter": "Strictly discard any forecast vintage where publishTime > decision_cutoff. This prevents look-ahead bias.",
            "step_4_latest_selection": "For each delivery period, select the forecast vintage with the maximum publishTime <= decision_cutoff.",
            "step_5_vintage_preservation": "Record and display the exact publication timestamp and calculate lead time: delivery_time - publish_time."
        },
        metrics_definitions={
            "error": "Error = Forecast - Actual (MW). Positive indicates overforecasting; negative indicates underforecasting.",
            "mae": "Mean Absolute Error: MAE = mean(|Forecast - Actual|). Typical absolute magnitude of forecast error in MW.",
            "rmse": "Root Mean Squared Error: RMSE = sqrt(mean((Forecast - Actual)^2)). Penalizes large forecast swings.",
            "bias": "Mean Forecast Bias: Bias = mean(Forecast - Actual). Systematic tendency to over- or under-estimate wind generation.",
            "mape": "Mean Absolute Percentage Error: MAPE = mean(|Forecast - Actual| / Actual) * 100. Strictly excludes actual observations below threshold (default 100 MW) to prevent near-zero division distortion."
        },
        handling_rules={
            "missing_values": "Missing values are never replaced with zero. Missing actuals are not treated as zero generation.",
            "unmatched_records": "Only periods with both valid forecast and actual generation at identical timestamps are compared. Unmatched records are reported in metadata.",
            "temporal_resolution": "WINDFOR publishes at hourly timestamps (:00), while FUELHH publishes half-hourly (:00 and :30). Exact matching on :00 timestamps provides 24 matched observations per day without synthetic interpolation."
        },
        limitations=[
            "Decision support only: Does not place automated trades or calculate net utility position (which requires consumer demand and retail contracts).",
            "National scope: WINDFOR and FUELHH represent Great Britain national wind generation, not individual wind farm assets or local zonal constraints.",
            "Hourly forecast resolution: Elexon WINDFOR provides hourly forecast intervals; intraday balancing actions may require half-hourly granularity.",
            "Historical immutability: Forecasts and actuals are subject to Elexon data settlement reconciliation runs."
        ]
    )
