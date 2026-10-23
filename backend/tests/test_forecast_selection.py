import pytest
from app.services.forecast_service import ForecastService, compute_lead_time_hours


def test_forecast_selection_multiple_vintages():
    """
    Test that when multiple vintages exist for a delivery period,
    forecasts after cutoff are excluded and the latest eligible vintage is selected.
    """
    service = ForecastService()
    decision_cutoff = "2026-01-15T11:00:00Z"
    target_delivery = "2026-01-16"

    records = [
        # Ineligible (after cutoff)
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T15:30:00Z", "generation": 9500.0},
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T12:00:00Z", "generation": 9200.0},
        # Eligible (before cutoff)
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T09:30:00Z", "generation": 8800.0},  # Latest eligible
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T07:30:00Z", "generation": 8400.0},
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-14T22:30:00Z", "generation": 8000.0},
    ]

    selected = service.select_latest_eligible_forecasts(records, decision_cutoff, target_delivery)
    assert "2026-01-16T12:00:00Z" in selected
    sel = selected["2026-01-16T12:00:00Z"]
    assert sel["publishTime"] == "2026-01-15T09:30:00Z"
    assert sel["generation"] == 8800.0


def test_exact_cutoff_boundary_condition():
    """
    Test boundary condition:
    Forecast published at exactly 11:00:00Z is ELIGIBLE (<= cutoff).
    Forecast published at 11:00:01Z is INELIGIBLE.
    """
    service = ForecastService()
    decision_cutoff = "2026-01-15T11:00:00Z"
    target_delivery = "2026-01-16"

    records = [
        {"startTime": "2026-01-16T10:00:00Z", "publishTime": "2026-01-15T11:00:01Z", "generation": 9999.0}, # Ineligible
        {"startTime": "2026-01-16T10:00:00Z", "publishTime": "2026-01-15T11:00:00Z", "generation": 7777.0}, # Eligible & latest
        {"startTime": "2026-01-16T10:00:00Z", "publishTime": "2026-01-15T10:59:59Z", "generation": 6666.0}, # Eligible but older
    ]

    selected = service.select_latest_eligible_forecasts(records, decision_cutoff, target_delivery)
    assert selected["2026-01-16T10:00:00Z"]["publishTime"] == "2026-01-15T11:00:00Z"
    assert selected["2026-01-16T10:00:00Z"]["generation"] == 7777.0


def test_month_boundary_transition_january_to_february():
    """
    Crucial business requirement:
    Decision made on 2026-01-31 concerns delivery on 2026-02-01.
    Selection logic must correctly select forecasts for February 1 delivery
    that were published before January 31 cutoff.
    """
    service = ForecastService()
    decision_cutoff = "2026-01-31T11:00:00Z"
    target_delivery = "2026-02-01"

    records = [
        {"startTime": "2026-02-01T04:00:00Z", "publishTime": "2026-01-31T09:30:00Z", "generation": 12500.0},
        {"startTime": "2026-02-01T04:00:00Z", "publishTime": "2026-01-31T14:30:00Z", "generation": 13000.0}, # After cutoff
        {"startTime": "2026-02-01T08:00:00Z", "publishTime": "2026-01-31T09:30:00Z", "generation": 14200.0},
    ]

    selected = service.select_latest_eligible_forecasts(records, decision_cutoff, target_delivery)
    assert len(selected) == 2
    assert selected["2026-02-01T04:00:00Z"]["publishTime"] == "2026-01-31T09:30:00Z"
    assert selected["2026-02-01T04:00:00Z"]["generation"] == 12500.0
    assert selected["2026-02-01T08:00:00Z"]["generation"] == 14200.0


def test_no_eligible_forecast_returns_no_silent_zeros():
    """
    If all available forecasts were published AFTER cutoff,
    the delivery period must NOT be assigned a silent zero or fabricated forecast.
    """
    service = ForecastService()
    decision_cutoff = "2026-01-15T08:00:00Z"
    target_delivery = "2026-01-16"

    records = [
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T09:30:00Z", "generation": 8800.0},
        {"startTime": "2026-01-16T12:00:00Z", "publishTime": "2026-01-15T15:30:00Z", "generation": 9500.0},
    ]

    selected = service.select_latest_eligible_forecasts(records, decision_cutoff, target_delivery)
    assert "2026-01-16T12:00:00Z" not in selected
    assert len(selected) == 0


def test_lead_time_calculation():
    """Verify lead time calculation in decimal hours."""
    delivery_time = "2026-01-16T12:00:00Z"
    publish_time = "2026-01-15T09:30:00Z"
    lead_time = compute_lead_time_hours(delivery_time, publish_time)
    # Difference: 26.5 hours
    assert lead_time == 26.5
