import pytest
from starlette.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "WindSight Analytics" in data["app"]


def test_methodology_endpoint():
    response = client.get("/api/methodology")
    assert response.status_code == 200
    data = response.json()
    assert "data_sources" in data
    assert "FUELHH" in data["data_sources"]["actual_generation"]["dataset"]
    assert "WINDFOR" in data["data_sources"]["forecast_generation"]["dataset"]
    assert "mae" in data["metrics_definitions"]
    assert len(data["limitations"]) > 0


def test_invalid_date_format_returns_400():
    response = client.get("/api/actuals?delivery_date=bad-date")
    assert response.status_code == 400
    assert "Invalid delivery_date" in response.json()["detail"]

    response = client.get("/api/evaluation?decision_date=not-a-date")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_evaluation_pipeline_with_mocked_data():
    """Test full evaluation endpoint with deterministic fixture data."""
    mock_actuals = [
        {"dataset": "FUELHH", "startTime": "2026-01-16T10:00:00Z", "settlementDate": "2026-01-16", "settlementPeriod": 21, "fuelType": "WIND", "generation": 5000.0},
        {"dataset": "FUELHH", "startTime": "2026-01-16T11:00:00Z", "settlementDate": "2026-01-16", "settlementPeriod": 23, "fuelType": "WIND", "generation": 6000.0},
    ]

    mock_forecasts = [
        # For 10:00: published before cutoff (eligible)
        {"dataset": "WINDFOR", "startTime": "2026-01-16T10:00:00Z", "publishTime": "2026-01-15T09:30:00Z", "generation": 5200.0},
        # For 10:00: published after cutoff (ineligible)
        {"dataset": "WINDFOR", "startTime": "2026-01-16T10:00:00Z", "publishTime": "2026-01-15T14:30:00Z", "generation": 7000.0},
        # For 11:00: published before cutoff (eligible)
        {"dataset": "WINDFOR", "startTime": "2026-01-16T11:00:00Z", "publishTime": "2026-01-15T09:30:00Z", "generation": 5800.0},
    ]

    with patch("app.services.elexon_client.elexon_client.fetch_actual_generation", new_callable=AsyncMock) as mock_fetch_act, \
         patch("app.services.elexon_client.elexon_client.fetch_wind_forecasts", new_callable=AsyncMock) as mock_fetch_fc:
        
        mock_fetch_act.return_value = mock_actuals
        mock_fetch_fc.return_value = mock_forecasts

        response = client.get("/api/evaluation?decision_date=2026-01-15&cutoff_time=11:00:00")
        assert response.status_code == 200
        data = response.json()

        assert data["decision_date"] == "2026-01-15"
        assert data["delivery_date"] == "2026-01-16"
        assert data["decision_cutoff"] == "2026-01-15T11:00:00Z"
        
        records = data["matched_records"]
        assert len(records) == 2
        
        # Period 1: Forecast 5200, Actual 5000 -> Error +200 (overforecast)
        assert records[0]["delivery_time"] == "2026-01-16T10:00:00Z"
        assert records[0]["forecast_mw"] == 5200.0
        assert records[0]["actual_mw"] == 5000.0
        assert records[0]["error_mw"] == 200.0
        assert records[0]["classification"] == "overforecast"
        assert records[0]["publish_time"] == "2026-01-15T09:30:00Z" # Not 14:30!

        # Period 2: Forecast 5800, Actual 6000 -> Error -200 (underforecast)
        assert records[1]["delivery_time"] == "2026-01-16T11:00:00Z"
        assert records[1]["forecast_mw"] == 5800.0
        assert records[1]["actual_mw"] == 6000.0
        assert records[1]["error_mw"] == -200.0
        assert records[1]["classification"] == "underforecast"

        # Check metrics: Errors: [+200, -200] -> MAE = 200, Bias = 0
        metrics = data["metrics"]
        assert metrics["mae"] == 200.0
        assert metrics["bias"] == 0.0
        assert metrics["matched_count"] == 2
