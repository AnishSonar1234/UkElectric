import pytest
import math
from app.analytics.metrics import (
    calculate_mae,
    calculate_rmse,
    calculate_bias,
    calculate_mape,
    compute_all_metrics
)


def test_perfect_forecast_metrics():
    """When forecasts match actuals exactly, all error metrics should be zero."""
    forecasts = [5000.0, 7500.0, 6200.0, 8100.0]
    actuals = [5000.0, 7500.0, 6200.0, 8100.0]
    
    assert calculate_mae(forecasts, actuals) == 0.0
    assert calculate_rmse(forecasts, actuals) == 0.0
    assert calculate_bias(forecasts, actuals) == 0.0
    mape, sample_size = calculate_mape(forecasts, actuals)
    assert mape == 0.0
    assert sample_size == 4


def test_known_dataset_manual_verification():
    """
    Test with hand-calculated values:
    Forecasts: [1000, 2000, 3000, 4000]
    Actuals:   [800,  2500, 2800, 4200]
    Errors (F - A): [+200, -500, +200, -200]
    Absolute errors: [200, 500, 200, 200]
    Sum abs errors = 1100 -> MAE = 1100 / 4 = 275.0
    Sum squared errors = 200^2 + (-500)^2 + 200^2 + (-200)^2 = 40000 + 250000 + 40000 + 40000 = 370000
    Mean squared error = 370000 / 4 = 92500 -> RMSE = sqrt(92500) ≈ 304.14
    Sum errors = 200 - 500 + 200 - 200 = -300 -> Bias = -300 / 4 = -75.0 (underforecasting)
    
    Percentage errors (|F - A| / A * 100):
    200 / 800 = 25.0%
    500 / 2500 = 20.0%
    200 / 2800 = 7.142857%
    200 / 4200 = 4.761905%
    Sum pct = 56.904762% -> MAPE ≈ 14.23%
    """
    forecasts = [1000.0, 2000.0, 3000.0, 4000.0]
    actuals = [800.0, 2500.0, 2800.0, 4200.0]

    assert calculate_mae(forecasts, actuals) == 275.0
    assert calculate_rmse(forecasts, actuals) == 304.14
    assert calculate_bias(forecasts, actuals) == -75.0
    
    mape, count = calculate_mape(forecasts, actuals, threshold_mw=100.0)
    assert count == 4
    assert mape == 14.23


def test_positive_bias_systematic_overforecasting():
    """Consistent overforecast must yield positive bias."""
    forecasts = [1200.0, 1500.0, 2000.0]
    actuals = [1000.0, 1300.0, 1800.0]
    # Each error is +200
    assert calculate_bias(forecasts, actuals) == 200.0
    assert calculate_mae(forecasts, actuals) == 200.0


def test_negative_bias_systematic_underforecasting():
    """Consistent underforecast must yield negative bias."""
    forecasts = [800.0, 1100.0, 1600.0]
    actuals = [1000.0, 1300.0, 1800.0]
    # Each error is -200
    assert calculate_bias(forecasts, actuals) == -200.0
    assert calculate_mae(forecasts, actuals) == 200.0


def test_mape_near_zero_actual_exclusion():
    """
    Observations where actuals are below threshold (e.g. 0 MW or calm wind)
    must be excluded to prevent division by zero or distortion.
    """
    forecasts = [500.0, 300.0, 2000.0, 150.0]
    actuals = [0.0, 40.0, 1800.0, 120.0]
    # Threshold 100 MW:
    # 0.0 is excluded (<100)
    # 40.0 is excluded (<100)
    # 1800.0 is included: |2000 - 1800| / 1800 = 200 / 1800 ≈ 11.11%
    # 120.0 is included: |150 - 120| / 120 = 30 / 120 = 25.0%
    # Valid count = 2. Mean = (11.1111 + 25.0) / 2 = 18.06%
    mape, sample_size = calculate_mape(forecasts, actuals, threshold_mw=100.0)
    assert sample_size == 2
    assert mape == 18.06


def test_mape_all_below_threshold():
    """If all observations are below the threshold, MAPE should safely return None and 0 count."""
    forecasts = [50.0, 20.0]
    actuals = [30.0, 10.0]
    mape, sample_size = calculate_mape(forecasts, actuals, threshold_mw=100.0)
    assert mape is None
    assert sample_size == 0


def test_empty_or_mismatched_inputs():
    """Mismatched list lengths or empty inputs should raise appropriate errors or return safe defaults."""
    with pytest.raises(ValueError):
        calculate_mae([100.0], [100.0, 200.0])

    with pytest.raises(ValueError):
        calculate_rmse([], [])

    res = compute_all_metrics([], [])
    assert res["sample_size"] == 0
    assert res["mae"] == 0.0
