import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.core.config import settings
from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)


class ElexonClient:
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = (base_url or settings.ELEXON_API_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS
        self.headers = {
            "Accept": "application/json",
            "User-Agent": f"WindSight-Analytics/{settings.VERSION}"
        }

    async def check_health(self) -> Tuple[bool, Optional[int], str]:
        """
        Actively checks if Elexon BMRS Insights API is reachable and responding.
        Does not claim health without verifying upstream status.
        """
        test_url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": "2026-01-01",
            "settlementDateTo": "2026-01-01",
            "settlementPeriod": 1,
            "fuelType": "WIND"
        }
        try:
            async with httpx.AsyncClient(timeout=10.0, headers=self.headers) as client:
                resp = await client.get(test_url, params=params)
                if resp.status_code == 200:
                    return True, resp.status_code, "Elexon Insights API is reachable and responding normally."
                return False, resp.status_code, f"Elexon API returned non-200 status code: {resp.status_code}"
        except httpx.TimeoutException:
            return False, None, "Connection to Elexon API timed out."
        except Exception as e:
            return False, None, f"Failed to connect to Elexon API: {str(e)}"

    async def fetch_actual_generation(
        self, 
        settlement_date_from: str, 
        settlement_date_to: str
    ) -> List[Dict[str, Any]]:
        """
        Fetches half-hourly actual national generation outturn (FUELHH) filtered by fuelType=WIND.
        Returns list of valid actual records with startTime, settlementDate, settlementPeriod, generation.
        """
        cache_key = f"FUELHH_WIND_{settlement_date_from}_{settlement_date_to}"
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": settlement_date_from,
            "settlementDateTo": settlement_date_to,
            "fuelType": "WIND"
        }

        logger.info(f"Fetching actuals from Elexon: {url} {params}")
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                records = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Elexon FUELHH HTTP error: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Upstream Elexon API returned HTTP {e.response.status_code} for FUELHH actuals.") from e
        except Exception as e:
            logger.error(f"Failed to fetch FUELHH from Elexon: {e}")
            raise RuntimeError(f"Failed to connect to Elexon API for FUELHH actuals: {str(e)}") from e

        # Normalize and filter strictly for valid WIND records
        clean_records: List[Dict[str, Any]] = []
        for r in records:
            if not isinstance(r, dict):
                continue
            if r.get("fuelType") != "WIND":
                continue
            start_time = r.get("startTime")
            gen = r.get("generation")
            if start_time is None or gen is None:
                continue
            try:
                gen_val = float(gen)
            except (ValueError, TypeError):
                continue
            
            clean_records.append({
                "dataset": "FUELHH",
                "startTime": start_time,
                "settlementDate": r.get("settlementDate"),
                "settlementPeriod": r.get("settlementPeriod"),
                "fuelType": "WIND",
                "generation": gen_val
            })

        # Cache valid result
        if clean_records:
            cache_service.set(cache_key, clean_records)
        
        return clean_records

    async def fetch_wind_forecasts(
        self, 
        publish_datetime_from: str, 
        publish_datetime_to: str
    ) -> List[Dict[str, Any]]:
        """
        Fetches wind generation forecasts (WINDFOR) published within the specified time window.
        Returns list of forecast records with startTime, publishTime, generation.
        """
        cache_key = f"WINDFOR_{publish_datetime_from}_{publish_datetime_to}"
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": publish_datetime_from,
            "publishDateTimeTo": publish_datetime_to
        }

        logger.info(f"Fetching WINDFOR forecasts from Elexon: {url} {params}")
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                records = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Elexon WINDFOR HTTP error: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Upstream Elexon API returned HTTP {e.response.status_code} for WINDFOR forecasts.") from e
        except Exception as e:
            logger.error(f"Failed to fetch WINDFOR from Elexon: {e}")
            raise RuntimeError(f"Failed to connect to Elexon API for WINDFOR forecasts: {str(e)}") from e

        clean_records: List[Dict[str, Any]] = []
        for r in records:
            if not isinstance(r, dict):
                continue
            start_time = r.get("startTime")
            pub_time = r.get("publishTime")
            gen = r.get("generation")
            if not start_time or not pub_time or gen is None:
                continue
            try:
                gen_val = float(gen)
            except (ValueError, TypeError):
                continue
            
            clean_records.append({
                "dataset": "WINDFOR",
                "startTime": start_time,
                "publishTime": pub_time,
                "generation": gen_val
            })

        if clean_records:
            cache_service.set(cache_key, clean_records)

        return clean_records


elexon_client = ElexonClient()
