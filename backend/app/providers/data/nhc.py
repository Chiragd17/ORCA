import asyncio
import io
import random
import re
import struct
import zipfile
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import logger


@dataclass
class NormalizedCycloneForecastPosition:
    """A deterministic future forecast position waypoint along a storm track."""

    id: str
    lead_time_hours: int
    valid_time: datetime
    latitude: float
    longitude: float
    max_wind_knots: float | None = None
    wind_gusts_knots: float | None = None
    min_pressure_hpa: float | None = None
    classification: str | None = None
    stage_description: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class NormalizedCycloneForecastRun:
    """An official cyclone forecast advisory run with its future forecast positions."""

    id: str
    storm_id: str
    storm_name: str
    basin: str
    provider: str
    advisory_number: str
    issue_time: datetime
    retrieval_time: datetime
    source_url: str
    positions: list[NormalizedCycloneForecastPosition] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


GEOGRAPHIC_COVERAGE: str = "eastern_pacific, north_atlantic, central_pacific (Note: Does not cover Indian Ocean)"


class NOAAForecastClient:
    """Production provider client for NOAA National Hurricane Center (NHC)

    official active cyclone forecast advisories and GIS trajectory products.
    """

    CURRENT_STORMS_URL: str = "https://www.nhc.noaa.gov/CurrentStorms.json"
    USER_AGENT: str = (
        "ORCA-Marine-Platform/1.0 (Marine Hazard & Forecast Agent; NOAA Integration)"
    )
    GEOGRAPHIC_COVERAGE: str = GEOGRAPHIC_COVERAGE

    def __init__(
        self, timeout_seconds: float | None = None, max_retries: int | None = None
    ):
        self.timeout_seconds = timeout_seconds or float(
            settings.EXTERNAL_REQUEST_TIMEOUT_SECONDS
        )
        self.max_retries = (
            max_retries if max_retries is not None else settings.MAX_PROVIDER_RETRIES
        )

    def _derive_basin(self, storm_id: str) -> str:
        sid = storm_id.lower()
        if sid.startswith("ep"):
            return "eastern_pacific"
        if sid.startswith("al"):
            return "north_atlantic"
        if sid.startswith("cp"):
            return "central_pacific"
        return "global_ocean"

    async def fetch_current_storms(self) -> dict[str, Any]:
        """Fetch active storms summary JSON from NOAA NHC with bounded retries."""
        last_exception: Exception | None = None
        headers = {"User-Agent": self.USER_AGENT}

        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(self.timeout_seconds), headers=headers
                ) as client:
                    logger.info(
                        f"Fetching NOAA NHC CurrentStorms.json [attempt={attempt + 1}/{self.max_retries + 1}]"
                    )
                    resp = await client.get(self.CURRENT_STORMS_URL)
                    raw_code = getattr(resp, "status_code", 200)
                    try:
                        status_code = int(raw_code)
                    except (ValueError, TypeError):
                        status_code = 200

                    if status_code == 429:
                        retry_after_hdr = getattr(resp, "headers", {}).get(
                            "Retry-After"
                        )
                        delay = (
                            float(retry_after_hdr)
                            if retry_after_hdr and str(retry_after_hdr).isdigit()
                            else settings.RETRY_BASE_DELAY_SECONDS
                        )
                        delay = min(delay, settings.MAX_RETRY_DELAY_SECONDS)
                        logger.warning(
                            f"NOAA NHC rate limit (429) hit on attempt {attempt + 1}. Backing off for {delay:.2f}s..."
                        )
                        if attempt < self.max_retries:
                            await asyncio.sleep(delay)
                            continue
                        raise httpx.HTTPStatusError(
                            "NOAA NHC rate limit exceeded (429)",
                            request=resp.request,
                            response=resp,
                        )

                    if status_code >= 500:
                        resp.raise_for_status()
                    elif status_code >= 400:
                        raise ValueError(
                            f"NOAA NHC returned client error {status_code}: {getattr(resp, 'text', '')[:200]}"
                        )
                    try:
                        return resp.json()
                    except Exception as json_err:
                        raise ValueError(
                            f"NOAA NHC returned malformed JSON: {json_err}"
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
                        f"NOAA NHC request failed: {exc}. Retrying in {backoff:.2f}s..."
                    )
                    await asyncio.sleep(backoff)
                else:
                    logger.error(
                        f"NOAA NHC request permanently failed after {self.max_retries + 1} attempts: {exc}"
                    )
                    raise last_exception from exc

        raise RuntimeError("NOAA NHC request failed unexpectedly")

    def _parse_dbf_bytes(self, data: bytes) -> list[dict[str, str]]:
        """Parse dBase III DBF binary records from a shapefile zip."""
        if len(data) < 32:
            return []

        num_records = struct.unpack("<I", data[4:8])[0]
        header_len = struct.unpack("<H", data[8:10])[0]
        record_len = struct.unpack("<H", data[10:12])[0]

        fields = []
        pos = 32
        while pos < header_len and data[pos] != 0x0D:
            fname = data[pos : pos + 11].decode("latin1").strip("\x00")
            ftype = chr(data[pos + 11])
            flen = data[pos + 16]
            fields.append((fname, ftype, flen))
            pos += 32

        records = []
        pos = header_len
        for _ in range(num_records):
            if pos + record_len > len(data):
                break
            rec = data[pos : pos + record_len]
            pos += record_len
            row = {}
            field_pos = 1
            for fname, _, flen in fields:
                val = rec[field_pos : field_pos + flen].decode("latin1").strip()
                row[fname] = val
                field_pos += flen
            records.append(row)

        return records

    async def fetch_forecast_positions_from_zip(
        self, zip_url: str, storm_id: str, adv_num: str, issue_time: datetime
    ) -> list[NormalizedCycloneForecastPosition]:
        """Fetch and extract 5-day forecast points from the official NOAA GIS zip package."""
        headers = {"User-Agent": self.USER_AGENT}
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout_seconds), headers=headers
            ) as client:
                r = await client.get(zip_url)
                if r.status_code != 200:
                    logger.warning(
                        f"Could not download NOAA GIS zip {zip_url}: HTTP {r.status_code}"
                    )
                    return []

                zf = zipfile.ZipFile(io.BytesIO(r.content))
                pts_dbf_name = next(
                    (n for n in zf.namelist() if n.endswith("pts.dbf")), None
                )
                if not pts_dbf_name:
                    logger.warning(f"No pts.dbf found in NOAA zip {zip_url}")
                    return []

                raw_records = self._parse_dbf_bytes(zf.read(pts_dbf_name))

            positions: list[NormalizedCycloneForecastPosition] = []
            for rec in raw_records:
                try:
                    tau_str = rec.get("TAU", "0")
                    tau = int(float(tau_str))
                    lat = float(rec.get("LAT", 0.0))
                    lon = float(rec.get("LON", 0.0))

                    # Convert 9999 sentinel values to None
                    wind_val = float(rec.get("MAXWIND", 0.0))
                    max_wind = wind_val if wind_val < 9000 else None

                    gust_val = float(rec.get("GUST", 0.0))
                    gusts = gust_val if gust_val < 9000 else None

                    mslp_val = float(rec.get("MSLP", 0.0))
                    mslp = mslp_val if mslp_val < 9000 and mslp_val > 800 else None

                    valid_time = issue_time + timedelta(hours=tau)

                    classification = rec.get("STORMTYPE") or rec.get("DVLBL")
                    stage = rec.get("TCDVLP") or rec.get("STORMSRC")

                    pos_id = f"cfp-{storm_id}-{adv_num.zfill(3)}-tau{tau:03d}"
                    positions.append(
                        NormalizedCycloneForecastPosition(
                            id=pos_id,
                            lead_time_hours=tau,
                            valid_time=valid_time,
                            latitude=lat,
                            longitude=lon,
                            max_wind_knots=max_wind,
                            wind_gusts_knots=gusts,
                            min_pressure_hpa=mslp,
                            classification=classification,
                            stage_description=stage,
                            metadata={"raw_record": rec},
                        )
                    )
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Error parsing point record in {zip_url}: {e}")

            return positions
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to fetch/parse NOAA forecast zip {zip_url}: {e}")
            return []

    async def fetch_forecast_positions_from_text(
        self, advisory_url: str, storm_id: str, adv_num: str, issue_time: datetime
    ) -> list[NormalizedCycloneForecastPosition]:
        """Fallback parser that parses future forecast coordinates from the official text advisory bulletin."""
        headers = {"User-Agent": self.USER_AGENT}
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout_seconds), headers=headers
            ) as client:
                r = await client.get(advisory_url)
                if r.status_code != 200:
                    return []
                text = r.text

            # Match patterns like: FORECAST VALID 16/0000Z 13.6N 101.9W\nMAX WIND  95 KT...GUSTS 115 KT.
            # or OUTLOOK VALID 19/1200Z 20.2N 107.4W
            pattern = re.compile(
                r"(?:FORECAST|OUTLOOK)\s+VALID\s+(\d{2}/\d{4})Z\s+(\d+\.\d+)([NS])\s+(\d+\.\d+)([EW])"
                r"(?:.*?(?:MAX\s+WIND\s+(\d+)\s*KT(?:\.\.\.GUSTS\s+(\d+)\s*KT)?))?",
                re.DOTALL | re.IGNORECASE,
            )

            positions: list[NormalizedCycloneForecastPosition] = []
            matches = pattern.finditer(text)
            tau_counter = 12

            for m in matches:
                _time_str, lat_v, lat_dir, lon_v, lon_dir, max_w, gust_w = m.groups()
                lat = float(lat_v) * (-1 if lat_dir.upper() == "S" else 1)
                lon = float(lon_v) * (-1 if lon_dir.upper() == "W" else 1)

                max_wind = float(max_w) if max_w else None
                gusts = float(gust_w) if gust_w else None

                valid_time = issue_time + timedelta(hours=tau_counter)
                pos_id = f"cfp-{storm_id}-{adv_num.zfill(3)}-tau{tau_counter:03d}"

                positions.append(
                    NormalizedCycloneForecastPosition(
                        id=pos_id,
                        lead_time_hours=tau_counter,
                        valid_time=valid_time,
                        latitude=lat,
                        longitude=lon,
                        max_wind_knots=max_wind,
                        wind_gusts_knots=gusts,
                        classification="FCST",
                        stage_description="Forecast Waypoint",
                    )
                )
                tau_counter += 12 if tau_counter < 72 else 24

            return positions
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Failed to parse text advisory from {advisory_url}: {e}")
            return []

    async def fetch_and_normalize_forecasts(self) -> list[NormalizedCycloneForecastRun]:
        """Fetch all active cyclone forecasts from NOAA NHC and normalize them."""
        raw_data = await self.fetch_current_storms()
        active_storms = raw_data.get("activeStorms") or []
        retrieval_now = datetime.now(UTC)
        forecast_runs: list[NormalizedCycloneForecastRun] = []

        for s in active_storms:
            storm_id = s.get("id") or s.get("binNumber") or "unknown"
            name = s.get("name") or "Unnamed"
            basin = self._derive_basin(storm_id)

            fcst_track = s.get("forecastTrack") or {}
            zip_url = fcst_track.get("zipFile")
            adv_num = str(fcst_track.get("advNum") or "001")

            issuance_str = fcst_track.get("issuance") or s.get("lastUpdate")
            if issuance_str:
                try:
                    issue_time = datetime.fromisoformat(issuance_str)
                except Exception:  # noqa: BLE001
                    issue_time = retrieval_now
            else:
                issue_time = retrieval_now

            run_id = f"cfr-noaa-nhc-{storm_id}-adv{adv_num.zfill(3)}"

            positions: list[NormalizedCycloneForecastPosition] = []
            if zip_url:
                positions = await self.fetch_forecast_positions_from_zip(
                    zip_url=zip_url,
                    storm_id=storm_id,
                    adv_num=adv_num,
                    issue_time=issue_time,
                )

            if not positions:
                fcst_adv = s.get("forecastAdvisory") or {}
                adv_url = fcst_adv.get("url")
                if adv_url:
                    positions = await self.fetch_forecast_positions_from_text(
                        advisory_url=adv_url,
                        storm_id=storm_id,
                        adv_num=adv_num,
                        issue_time=issue_time,
                    )

            forecast_runs.append(
                NormalizedCycloneForecastRun(
                    id=run_id,
                    storm_id=storm_id,
                    storm_name=name,
                    basin=basin,
                    provider="NOAA NHC",
                    advisory_number=adv_num,
                    issue_time=issue_time,
                    retrieval_time=retrieval_now,
                    source_url=zip_url or self.CURRENT_STORMS_URL,
                    positions=positions,
                    metadata={
                        "raw_storm_summary": {
                            "classification": s.get("classification"),
                            "intensity": s.get("intensity"),
                            "pressure": s.get("pressure"),
                            "movementDir": s.get("movementDir"),
                            "movementSpeed": s.get("movementSpeed"),
                        }
                    },
                )
            )

        return forecast_runs
