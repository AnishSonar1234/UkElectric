import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import logging
from dateutil import parser

from app.services.elexon_client import elexon_client
from app.analytics.metrics import compute_all_metrics
from app.schemas.models import (
    MatchedDeliveryPeriod,
    AccuracyMetrics,
    EvaluationResponse,
    VintageItem
)

logger = logging.getLogger(__name__)


def parse_iso(ts_str: str) -> datetime:
    """Fast ISO timestamp parser returning UTC-aware datetime."""
    try:
        if ts_str.endswith("Z"):
            return datetime.fromisoformat(ts_str[:-1] + "+00:00")
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        dt = parser.isoparse(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)


def compute_lead_time_hours(delivery_time_str: str, publish_time_str: str) -> float:
    """Computes lead time in decimal hours: (delivery_time - publish_time)."""
    deliv_dt = parse_iso(delivery_time_str)
    pub_dt = parse_iso(publish_time_str)
    diff_sec = (deliv_dt - pub_dt).total_seconds()
    return round(diff_sec / 3600.0, 2)


class ForecastService:
    @staticmethod
    def select_latest_eligible_forecasts(
        forecast_records: List[Dict[str, Any]],
        decision_cutoff_iso: str,
        target_delivery_date: str
    ) -> Dict[str, Dict[str, Any]]:
        """
        Core Business Rule:
        For each delivery period in target_delivery_date:
        1. Consider all forecast vintages with matching delivery period (startTime).
        2. Filter out forecasts with publishTime > decision_cutoff (strict look-ahead bias elimination).
        3. From remaining eligible forecasts, select the record with the latest publishTime.
        
        Returns:
            Dictionary mapping startTime (delivery period ISO string) -> selected forecast record.
        """
        cutoff_dt = parse_iso(decision_cutoff_iso)
        candidates_by_period: Dict[str, List[Dict[str, Any]]] = {}

        for rec in forecast_records:
            st = rec.get("startTime")
            pt = rec.get("publishTime")
            gen = rec.get("generation")
            if not st or not pt or gen is None:
                continue

            # Fast check: delivery period matches target delivery date (YYYY-MM-DD)
            if not st.startswith(target_delivery_date):
                continue

            candidates_by_period.setdefault(st, []).append(rec)

        selected_map: Dict[str, Dict[str, Any]] = {}
        for st, vintages in candidates_by_period.items():
            # Filter strictly eligible vintages published ON or BEFORE decision cutoff
            eligible = [
                v for v in vintages 
                if parse_iso(v["publishTime"]) <= cutoff_dt
            ]
            if not eligible:
                logger.info(f"No eligible forecast for delivery period {st} prior to {decision_cutoff_iso}")
                continue

            # Select latest eligible publishTime
            latest_eligible = max(eligible, key=lambda v: parse_iso(v["publishTime"]))
            selected_map[st] = latest_eligible

        return selected_map

    @staticmethod
    def extract_vintages_for_delivery_period(
        forecast_records: List[Dict[str, Any]],
        delivery_time_iso: str,
        decision_cutoff_iso: str
    ) -> List[VintageItem]:
        """
        Extracts all published vintages for a specific delivery period,
        annotating each with eligibility and whether it was selected.
        """
        cutoff_dt = parse_iso(decision_cutoff_iso)
        target_st_dt = parse_iso(delivery_time_iso)

        matching_vintages = [
            r for r in forecast_records
            if parse_iso(r["startTime"]) == target_st_dt
        ]

        if not matching_vintages:
            return []

        # Find the selected record
        eligible_vintages = [
            v for v in matching_vintages
            if parse_iso(v["publishTime"]) <= cutoff_dt
        ]
        selected_v = max(eligible_vintages, key=lambda v: parse_iso(v["publishTime"])) if eligible_vintages else None

        items: List[VintageItem] = []
        # Sort chronologically by publishTime
        for v in sorted(matching_vintages, key=lambda x: parse_iso(x["publishTime"])):
            pub_dt = parse_iso(v["publishTime"])
            is_eligible = pub_dt <= cutoff_dt
            is_selected = (selected_v is not None and v["publishTime"] == selected_v["publishTime"])
            lead_time = compute_lead_time_hours(v["startTime"], v["publishTime"])
            
            items.append(VintageItem(
                startTime=v["startTime"],
                publishTime=v["publishTime"],
                generation=float(v["generation"]),
                is_eligible=is_eligible,
                is_selected=is_selected,
                lead_time_hours=lead_time
            ))

        return items

    async def evaluate_forecast_accuracy(
        self,
        decision_date: str,
        cutoff_time: str = "11:00:00",
        delivery_date: Optional[str] = None,
        mape_threshold_mw: float = 100.0
    ) -> EvaluationResponse:
        """
        Runs complete day-ahead forecast evaluation pipeline:
        1. Validates and sets dates (delivery_date = decision_date + 1 day by default).
        2. Concurrently ingests actuals from FUELHH and WINDFOR forecasts.
        3. Applies cutoff filter and selects latest eligible forecast vintage for each delivery period.
        4. Matches forecasts with actuals on exact delivery startTime.
        5. Computes statistical metrics (MAE, RMSE, Bias, MAPE).
        6. Generates summary insight and structured evaluation report.
        """
        dec_dt = datetime.strptime(decision_date, "%Y-%m-%d").date()
        if delivery_date is None:
            deliv_dt = dec_dt + timedelta(days=1)
            delivery_date_str = deliv_dt.strftime("%Y-%m-%d")
        else:
            delivery_date_str = delivery_date

        decision_cutoff_iso = f"{decision_date}T{cutoff_time}Z"
        
        # Window for WINDFOR publication (Day D or D-1)
        pub_from = f"{(dec_dt - timedelta(days=1)).strftime('%Y-%m-%d')}T00:00:00Z"
        pub_to = f"{decision_date}T23:59:59Z"

        # Concurrently fetch both actuals and forecasts for optimal latency
        actual_records, forecast_records = await asyncio.gather(
            elexon_client.fetch_actual_generation(
                settlement_date_from=delivery_date_str,
                settlement_date_to=delivery_date_str
            ),
            elexon_client.fetch_wind_forecasts(
                publish_datetime_from=pub_from,
                publish_datetime_to=pub_to
            )
        )

        # Select latest eligible forecast per delivery period
        selected_forecasts = self.select_latest_eligible_forecasts(
            forecast_records=forecast_records,
            decision_cutoff_iso=decision_cutoff_iso,
            target_delivery_date=delivery_date_str
        )

        # Build lookup for actuals by normalized startTime ISO
        actuals_by_start: Dict[str, Dict[str, Any]] = {
            act["startTime"]: act for act in actual_records
        }

        matched_periods: List[MatchedDeliveryPeriod] = []
        forecast_values: List[float] = []
        actual_values: List[float] = []
        lead_times: List[float] = []

        # Sort delivery periods chronologically
        sorted_start_times = sorted(selected_forecasts.keys(), key=lambda x: parse_iso(x))

        for st in sorted_start_times:
            fc = selected_forecasts[st]
            act = actuals_by_start.get(st)
            
            # Rule: Never compare unmatched records or fabricate zero actuals
            if act is None:
                continue

            f_mw = round(float(fc["generation"]), 1)
            a_mw = round(float(act["generation"]), 1)
            err_mw = round(f_mw - a_mw, 1)
            abs_err_mw = round(abs(err_mw), 1)
            
            pct_err: Optional[float] = None
            if abs(a_mw) >= mape_threshold_mw:
                pct_err = round((abs_err_mw / abs(a_mw)) * 100.0, 1)

            classification = "exact"
            if err_mw > 0:
                classification = "overforecast"
            elif err_mw < 0:
                classification = "underforecast"

            lead_hours = compute_lead_time_hours(st, fc["publishTime"])
            lead_times.append(lead_hours)

            matched_periods.append(MatchedDeliveryPeriod(
                delivery_time=st,
                settlement_period=act.get("settlementPeriod"),
                forecast_mw=f_mw,
                actual_mw=a_mw,
                error_mw=err_mw,
                abs_error_mw=abs_err_mw,
                percentage_error=pct_err,
                publish_time=fc["publishTime"],
                lead_time_hours=lead_hours,
                classification=classification
            ))

            forecast_values.append(f_mw)
            actual_values.append(a_mw)

        # Compute aggregate metrics
        stat_results = compute_all_metrics(
            forecasts=forecast_values,
            actuals=actual_values,
            mape_threshold_mw=mape_threshold_mw
        )

        total_actual_count = len(actual_records)
        total_fc_periods = len(selected_forecasts)
        unmatched_act = max(0, total_actual_count - len(matched_periods))

        min_lead = min(lead_times) if lead_times else None
        max_lead = max(lead_times) if lead_times else None
        avg_lead = round(sum(lead_times) / len(lead_times), 1) if lead_times else None

        metrics = AccuracyMetrics(
            mae=stat_results["mae"],
            rmse=stat_results["rmse"],
            bias=stat_results["bias"],
            mape=stat_results["mape"],
            mape_sample_size=stat_results["mape_sample_size"],
            mape_threshold_mw=mape_threshold_mw,
            matched_count=len(matched_periods),
            total_actual_periods=total_actual_count,
            total_forecast_periods=total_fc_periods,
            unmatched_actual_count=unmatched_act,
            decision_date=decision_date,
            delivery_date=delivery_date_str,
            decision_cutoff=decision_cutoff_iso,
            min_lead_time_hours=min_lead,
            max_lead_time_hours=max_lead,
            avg_lead_time_hours=avg_lead,
            units="MW"
        )

        # Formulate concise executive insight
        if matched_periods:
            bias_dir = "overforecasted" if metrics.bias > 0 else ("underforecasted" if metrics.bias < 0 else "neutral")
            max_period = max(matched_periods, key=lambda p: abs(p.error_mw))
            summary_insight = (
                f"Day-ahead wind forecasts for delivery on {delivery_date_str} (decision cutoff {cutoff_time} UTC) "
                f"had an MAE of {metrics.mae} MW and RMSE of {metrics.rmse} MW. "
                f"Generation was {bias_dir} by an average of {abs(metrics.bias)} MW. "
                f"Peak error occurred at {max_period.delivery_time[11:16]} UTC ({max_period.error_mw:+} MW)."
            )
        else:
            summary_insight = f"No matched forecast-actual observations available for {delivery_date_str}."

        return EvaluationResponse(
            decision_date=decision_date,
            delivery_date=delivery_date_str,
            decision_cutoff=decision_cutoff_iso,
            units="MW",
            metrics=metrics,
            matched_records=matched_periods,
            summary_insight=summary_insight
        )


forecast_service = ForecastService()
