import asyncio
import random
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, ClassVar

import httpx

from app.core.config import settings
from app.core.logging import logger


@dataclass
class NormalizedMarineForecastPoint:
    """A validated, normalized hourly marine wave forecast record."""

    id: str
    provider: str
    model: str
    latitude: float
    longitude: float
    valid_time: datetime
    wave_height_m: float | None
    wave_period_s: float | None
    wave_direction_deg: float | None
    wind_wave_height_m: float | None
    swell_wave_height_m: float | None
    retrieval_time: datetime
    source_url: str
    metadata: dict = field(default_factory=dict)


class OpenMeteoMarineClient:
    """Production client for retrieving, validating, and normalizing marine forecasts

    from the Open-Meteo Marine API (https://marine-api.open-meteo.com/v1/marine).
    """

    DEFAULT_HOURLY_VARIABLES: ClassVar[list[str]] = [
        "wave_height",
        "wave_direction",
        "wave_period",
        "wind_wave_height",
        "swell_wave_height",
    ]

    def __init__(
        self,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
    ):
        self.base_url = (base_url or settings.OPEN_METEO_BASE_URL).rstrip("/")
        self.timeout_seconds = timeout_seconds or float(
            settings.EXTERNAL_REQUEST_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.MAX_PROVIDER_RETRIES
        )

    def validate_coordinates(self, latitude: float, longitude: float) -> None:
        """Validate latitude and longitude bounds."""
        if not (-90.0 <= latitude <= 90.0):
            raise ValueError(f"Latitude {latitude} out of bounds [-90, 90]")
        if not (-180.0 <= longitude <= 180.0):
            raise ValueError(f"Longitude {longitude} out of bounds [-180, 180]")

    async def fetch_marine_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 3,
        hourly_variables: list[str] | None = None,
    ) -> dict[str, Any]:
        """Fetch raw JSON forecast from Open-Meteo with bounded retries."""
        self.validate_coordinates(latitude, longitude)
        if not (1 <= forecast_days <= 7):
            raise ValueError(f"forecast_days {forecast_days} must be between 1 and 7")

        variables = hourly_variables or self.DEFAULT_HOURLY_VARIABLES
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ",".join(variables),
            "timezone": "UTC",
            "forecast_days": forecast_days,
        }

        last_exception: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(self.timeout_seconds)
                ) as client:
                    logger.info(
                        f"Fetching Open-Meteo marine forecast for ({latitude}, {longitude}) "
                        f"[days={forecast_days}, attempt={attempt + 1}/{self.max_retries + 1}]"
                    )
                    response = await client.get(self.base_url, params=params)
                    raw_code = getattr(response, "status_code", 200)
                    try:
                        status_code = int(raw_code)
                    except (ValueError, TypeError):
                        status_code = 200

                    if status_code == 429:
                        retry_after_hdr = getattr(response, "headers", {}).get(
                            "Retry-After"
                        )
                        delay = (
                            float(retry_after_hdr)
                            if retry_after_hdr and str(retry_after_hdr).isdigit()
                            else settings.RETRY_BASE_DELAY_SECONDS
                        )
                        delay = min(delay, settings.MAX_RETRY_DELAY_SECONDS)
                        logger.warning(
                            f"Open-Meteo rate limit (429) hit on attempt {attempt + 1}. Backing off for {delay:.2f}s..."
                        )
                        if attempt < self.max_retries:
                            await asyncio.sleep(delay)
                            continue
                        raise httpx.HTTPStatusError(
                            "Open-Meteo rate limit exceeded (429)",
                            request=response.request,
                            response=response,
                        )

                    if status_code >= 500:
                        response.raise_for_status()
                    elif status_code >= 400:
                        raise ValueError(
                            f"Open-Meteo API returned client error {status_code}: {getattr(response, 'text', '')}"
                        )
                    try:
                        return response.json()
                    except Exception as json_err:
                        raise ValueError(
                            f"Open-Meteo returned malformed JSON: {json_err}"
                        ) from json_err

            except (
                httpx.TimeoutException,
                httpx.NetworkError,
                httpx.HTTPStatusError,
            ) as exc:
                last_exception = exc
                if attempt < self.max_retries:
                    backoff = min(
                        settings.MAX_RETRY_DELAY_SECONDS,
                        settings.RETRY_BASE_DELAY_SECONDS * (2**attempt)
                        + random.uniform(0.05, 0.15),
                    )
                    logger.warning(
                        f"Open-Meteo request attempt {attempt + 1} failed: {exc}. Retrying in {backoff:.2f}s..."
                    )
                    await asyncio.sleep(backoff)
                else:
                    logger.error(
                        f"Open-Meteo request permanently failed after {self.max_retries + 1} attempts: {exc}"
                    )
                    raise last_exception from exc

        raise RuntimeError("Open-Meteo request failed with unhandled exception")

    def normalize_forecast_response(
        self, raw_data: dict[str, Any], requested_lat: float, requested_lon: float
    ) -> list[NormalizedMarineForecastPoint]:
        """Validate response structure, align time arrays, and produce normalized points."""
        if not isinstance(raw_data, dict):
            raise TypeError(f"Expected dict from Open-Meteo, received {type(raw_data)}")

        hourly = raw_data.get("hourly")
        if not isinstance(hourly, dict) or "time" not in hourly:
            raise ValueError(
                "Malformed Open-Meteo response: missing 'hourly.time' array"
            )

        times: list[str] = hourly.get("time") or []
        if not times:
            logger.warning(
                f"No hourly time points in Open-Meteo response for ({requested_lat}, {requested_lon})"
            )
            return []

        # Snapped grid coordinates from provider
        grid_lat = float(raw_data.get("latitude", requested_lat))
        grid_lon = float(raw_data.get("longitude", requested_lon))

        wave_heights = hourly.get("wave_height") or []
        wave_dirs = hourly.get("wave_direction") or []
        wave_periods = hourly.get("wave_period") or []
        wind_wave_heights = hourly.get("wind_wave_height") or []
        swell_wave_heights = hourly.get("swell_wave_height") or []

        # Validate array alignment
        n = len(times)
        for var_name, arr in [
            ("wave_height", wave_heights),
            ("wave_direction", wave_dirs),
            ("wave_period", wave_periods),
        ]:
            if arr and len(arr) != n:
                logger.warning(
                    f"Array length mismatch in Open-Meteo for '{var_name}': expected {n}, got {len(arr)}"
                )

        retrieval_now = datetime.now(UTC)
        normalized_points: list[NormalizedMarineForecastPoint] = []

        hourly_units = raw_data.get("hourly_units", {})
        meta_base = {
            "elevation": raw_data.get("elevation"),
            "generationtime_ms": raw_data.get("generationtime_ms"),
            "hourly_units": hourly_units,
            "requested_latitude": requested_lat,
            "requested_longitude": requested_lon,
        }

        for i, time_str in enumerate(times):
            # Parse ISO 8601 timestamp and normalize to UTC
            try:
                # Open-Meteo returns e.g. "2026-10-15T12:00"
                if "T" in time_str:
                    dt = datetime.fromisoformat(time_str)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=UTC)
                    else:
                        dt = dt.astimezone(UTC)
                else:
                    continue
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    f"Failed to parse time '{time_str}' from Open-Meteo: {e}"
                )
                continue

            # Extract physics values (treating None as missing)
            wh = (
                float(wave_heights[i])
                if i < len(wave_heights) and wave_heights[i] is not None
                else None
            )
            wd = (
                float(wave_dirs[i])
                if i < len(wave_dirs) and wave_dirs[i] is not None
                else None
            )
            wp = (
                float(wave_periods[i])
                if i < len(wave_periods) and wave_periods[i] is not None
                else None
            )
            wwh = (
                float(wind_wave_heights[i])
                if i < len(wind_wave_heights) and wind_wave_heights[i] is not None
                else None
            )
            swh = (
                float(swell_wave_heights[i])
                if i < len(swell_wave_heights) and swell_wave_heights[i] is not None
                else None
            )

            # Generate deterministic record ID
            point_id = (
                f"mf-om-{grid_lat:.3f}-{grid_lon:.3f}-{dt.strftime('%Y%m%d%H%M')}"
            )

            normalized_points.append(
                NormalizedMarineForecastPoint(
                    id=point_id,
                    provider="open-meteo-marine",
                    model="standard",
                    latitude=grid_lat,
                    longitude=grid_lon,
                    valid_time=dt,
                    wave_height_m=wh,
                    wave_period_s=wp,
                    wave_direction_deg=wd,
                    wind_wave_height_m=wwh,
                    swell_wave_height_m=swh,
                    retrieval_time=retrieval_now,
                    source_url=self.base_url,
                    metadata=meta_base,
                )
            )

        return normalized_points

    async def fetch_and_normalize(
        self,
        latitude: float,
        longitude: float,
        forecast_days: int = 3,
    ) -> list[NormalizedMarineForecastPoint]:
        """End-to-end fetch and parse pipeline for marine forecasts."""
        raw_data = await self.fetch_marine_forecast(
            latitude=latitude,
            longitude=longitude,
            forecast_days=forecast_days,
        )
        return self.normalize_forecast_response(raw_data, latitude, longitude)
