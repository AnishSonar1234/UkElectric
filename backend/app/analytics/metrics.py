import math
from typing import List, Dict, Any, Optional, Tuple


def calculate_mae(forecasts: List[float], actuals: List[float]) -> float:
    """
    Mean Absolute Error (MAE) in MW.
    MAE = mean(|F - A|)
    Represents the typical magnitude of forecast errors in Megawatts.
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals):
        raise ValueError("Forecasts and actuals must be non-empty lists of identical length.")
    
    total_abs_err = sum(abs(f - a) for f, a in zip(forecasts, actuals))
    return round(total_abs_err / len(forecasts), 2)


def calculate_rmse(forecasts: List[float], actuals: List[float]) -> float:
    """
    Root Mean Squared Error (RMSE) in MW.
    RMSE = sqrt(mean((F - A)^2))
    Penalizes large errors more heavily than MAE; critical for grid reserve sizing.
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals):
        raise ValueError("Forecasts and actuals must be non-empty lists of identical length.")
    
    mean_sq_err = sum((f - a) ** 2 for f, a in zip(forecasts, actuals)) / len(forecasts)
    return round(math.sqrt(mean_sq_err), 2)


def calculate_bias(forecasts: List[float], actuals: List[float]) -> float:
    """
    Mean Forecast Bias in MW.
    Bias = mean(F - A)
    Positive bias: Systematic overforecasting (bought excess power day-ahead).
    Negative bias: Systematic underforecasting (utility short on delivery).
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals):
        raise ValueError("Forecasts and actuals must be non-empty lists of identical length.")
    
    total_err = sum(f - a for f, a in zip(forecasts, actuals))
    return round(total_err / len(forecasts), 2)


def calculate_mape(
    forecasts: List[float], 
    actuals: List[float], 
    threshold_mw: float = 100.0
) -> Tuple[Optional[float], int]:
    """
    Mean Absolute Percentage Error (MAPE) in %.
    MAPE = mean(|F - A| / |A|) * 100
    
    Observations where actual generation A < threshold_mw (e.g., calm conditions or near-zero generation)
    are strictly excluded to avoid mathematical instability (division by near-zero).
    
    Returns:
        (mape_percentage, valid_sample_size)
    """
    if not forecasts or not actuals or len(forecasts) != len(actuals):
        raise ValueError("Forecasts and actuals must be non-empty lists of identical length.")
    
    valid_pct_errors = [
        abs(f - a) / abs(a) * 100.0
        for f, a in zip(forecasts, actuals)
        if a is not None and abs(a) >= threshold_mw
    ]
    
    if not valid_pct_errors:
        return None, 0
    
    mape = sum(valid_pct_errors) / len(valid_pct_errors)
    return round(mape, 2), len(valid_pct_errors)


def compute_all_metrics(
    forecasts: List[float],
    actuals: List[float],
    mape_threshold_mw: float = 100.0
) -> Dict[str, Any]:
    """
    Computes all standard statistical metrics for a paired list of forecasts and actuals.
    """
    if not forecasts or not actuals:
        return {
            "mae": 0.0,
            "rmse": 0.0,
            "bias": 0.0,
            "mape": None,
            "mape_sample_size": 0,
            "mape_threshold_mw": mape_threshold_mw,
            "sample_size": 0
        }
    
    if len(forecasts) != len(actuals):
        raise ValueError(f"Mismatched lengths: {len(forecasts)} forecasts vs {len(actuals)} actuals.")
    
    mae = calculate_mae(forecasts, actuals)
    rmse = calculate_rmse(forecasts, actuals)
    bias = calculate_bias(forecasts, actuals)
    mape, mape_sample_size = calculate_mape(forecasts, actuals, threshold_mw=mape_threshold_mw)
    
    return {
        "mae": mae,
        "rmse": rmse,
        "bias": bias,
        "mape": mape,
        "mape_sample_size": mape_sample_size,
        "mape_threshold_mw": mape_threshold_mw,
        "sample_size": len(forecasts)
    }
