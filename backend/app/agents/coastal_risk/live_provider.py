"""
Live Marine & Coastal Data Provider Adapter for Person 3 Coastal Risk Agent.
Fetches real-time marine observations (significant wave height, wave period, swell height)
from Open-Meteo Marine API (https://marine-api.open-meteo.com/v1/marine).

Features:
- No proprietary API key required (open scientific endpoint).
- Strict connection/read timeouts and graceful error handling.
- Deterministic response normalization and SHA-256 evidence hashing.
- Distinguishes missing/unavailable data from measured zero values.
- Never substitutes mock data when a live network request fails.
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import httpx
from app.agents.coastal_risk.spatial import validate_coordinates
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class LiveMarineObservation:
    """Normalized live marine observation record."""
    latitude: float
    longitude: float
    wave_height: Optional[float]
    wave_period: Optional[float]
    wave_direction: Optional[float]
    swell_wave_height: Optional[float]
    wind_wave_height: Optional[float]
    observation_time: datetime
    retrieval_time: datetime
    units: Dict[str, str]
    raw_payload: Dict[str, Any]
    hash: str
    source_name: str = "Open-Meteo Marine API"
    source_url: str = "https://marine-api.open-meteo.com/v1/marine"
    source_identifier: str = ""

    def is_high_wave_hazard(self, threshold_m: float = 2.0) -> bool:
        """Check if significant wave height exceeds coastal hazard advisory threshold."""
        return self.wave_height is not None and self.wave_height >= threshold_m


_COASTAL_LIVE_CACHE: dict[str, tuple[float, LiveMarineObservation]] = {}
_COASTAL_LIVE_TTL: float = 300.0  # 5 minutes


class OpenMeteoMarineClient:
    """Async HTTP client for Open-Meteo Marine API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout_seconds: float = 2.5,
    ):
        self.base_url = base_url or getattr(settings, "OPEN_METEO_BASE_URL", "https://marine-api.open-meteo.com/v1/marine")
        self.timeout = min(timeout_seconds, 2.5)

    async def fetch_current_conditions(
        self, latitude: float, longitude: float
    ) -> Tuple[Optional[LiveMarineObservation], Optional[str]]:
        """
        Fetch real-time current marine conditions for target coordinates.
        Returns: (observation_or_none, error_message_or_none)
        """
        cache_key = f"{round(latitude, 2)}_{round(longitude, 2)}"
        now_ts = datetime.now(timezone.utc).timestamp()
        if cache_key in _COASTAL_LIVE_CACHE:
            ts, obs = _COASTAL_LIVE_CACHE[cache_key]
            if (now_ts - ts) < _COASTAL_LIVE_TTL:
                return obs, None

        try:
            validate_coordinates(latitude, longitude)
        except ValueError as ve:
            return None, f"Invalid coordinates for live marine query: {ve}"

        params = {
            "latitude": round(latitude, 4),
            "longitude": round(longitude, 4),
            "current": "wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height",
            "timezone": "UTC",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)

                if response.status_code != 200:
                    err_msg = f"Open-Meteo returned HTTP {response.status_code}: {response.text[:120]}"
                    logger.warning(err_msg)
                    return None, err_msg

                payload = response.json()
                obs, err = self._parse_payload(latitude, longitude, payload)
                if obs:
                    _COASTAL_LIVE_CACHE[cache_key] = (now_ts, obs)
                return obs, err

        except httpx.ConnectTimeout:
            err_msg = "Connection timeout to Open-Meteo Marine API."
            logger.info(err_msg)
            return None, err_msg
        except httpx.ReadTimeout:
            err_msg = "Read timeout waiting for Open-Meteo Marine API response."
            logger.info(err_msg)
            return None, err_msg
        except httpx.RequestError as req_err:
            err_msg = f"Network communication error connecting to live marine provider: {req_err}"
            logger.info(err_msg)
            return None, err_msg
        except Exception as exc:
            err_msg = f"Unexpected error processing live marine observation: {exc}"
            logger.error(err_msg)
            return None, err_msg

    def _parse_payload(
        self, latitude: float, longitude: float, payload: Dict[str, Any]
    ) -> Tuple[Optional[LiveMarineObservation], Optional[str]]:
        """Validate and normalize Open-Meteo JSON payload."""
        if not isinstance(payload, dict):
            return None, "Malformed provider response: root is not a dictionary."

        current = payload.get("current")
        if not current or not isinstance(current, dict):
            return None, "Malformed provider response: missing 'current' observations block."

        time_str = current.get("time")
        if not time_str:
            return None, "Missing observation timestamp in provider payload."

        try:
            # Open-Meteo returns ISO8601 string, e.g. '2026-10-15T15:00'
            obs_time = datetime.fromisoformat(time_str).replace(tzinfo=timezone.utc)
        except Exception:
            obs_time = datetime.now(timezone.utc)

        retrieval_time = datetime.now(timezone.utc)

        # Extract numerical readings safely
        wave_height = self._safe_float(current.get("wave_height"))
        wave_period = self._safe_float(current.get("wave_period"))
        wave_dir = self._safe_float(current.get("wave_direction"))
        wind_wave = self._safe_float(current.get("wind_wave_height"))
        swell_wave = self._safe_float(current.get("swell_wave_height"))

        units = payload.get("current_units") or {
            "wave_height": "m",
            "wave_period": "s",
            "wave_direction": "degrees",
            "swell_wave_height": "m",
        }

        # Canonical sorted JSON string for collision-resistant SHA-256 hash
        canonical_str = json.dumps(current, sort_keys=True)
        payload_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

        source_id = f"open-meteo:marine:{round(latitude, 4)}:{round(longitude, 4)}:{time_str}"

        obs = LiveMarineObservation(
            latitude=latitude,
            longitude=longitude,
            wave_height=wave_height,
            wave_period=wave_period,
            wave_direction=wave_dir,
            swell_wave_height=swell_wave,
            wind_wave_height=wind_wave,
            observation_time=obs_time,
            retrieval_time=retrieval_time,
            units=units,
            raw_payload=payload,
            hash=payload_hash,
            source_url=self.base_url,
            source_identifier=source_id,
        )

        return obs, None

    @staticmethod
    def _safe_float(val: Any) -> Optional[float]:
        if val is None:
            return None
        try:
            f = float(val)
            import math
            return f if not (math.isnan(f) or math.isinf(f)) else None
        except (ValueError, TypeError):
            return None
