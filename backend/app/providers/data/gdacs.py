import asyncio
import random
from datetime import UTC, datetime
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging import logger
from app.schemas.hazard import HazardRead, HazardTrackPoint


class GDACSEvent(BaseModel):
    event_id: str
    event_name: str
    name: str
    alert_level: str  # Green, Orange, Red
    alert_score: float = 0.0
    latitude: float | None = None
    longitude: float | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    modified_date: datetime | None = None
    country: str = ""
    severity_kmh: float | None = None
    severity_knots: float | None = None
    severity_text: str = ""
    report_url: str | None = None
    is_current: bool = True
    geometry: dict[str, Any] | None = None


class GDACSValidationReport(BaseModel):
    retrieved_count: int = 0
    validated_count: int = 0
    rejected_count: int = 0
    rejection_reasons: list[str] = Field(default_factory=list)
    events: list[GDACSEvent] = Field(default_factory=list)


def infer_cyclone_basin(latitude: float | None, longitude: float | None) -> str:
    """Infer standard oceanic basin from geographic centroid coordinates."""
    if latitude is None or longitude is None:
        return "global"

    # North Indian Ocean basins
    if 0.0 <= latitude <= 35.0:
        if 45.0 <= longitude < 77.5:
            return "arabian_sea"
        if 77.5 <= longitude <= 100.0:
            return "bay_of_bengal"

    # South Indian Ocean
    if -45.0 <= latitude < 0.0 and 20.0 <= longitude <= 105.0:
        return "south_indian_ocean"

    # Pacific and Atlantic basins
    if 0.0 <= latitude <= 60.0:
        if 100.0 < longitude <= 180.0:
            return "western_pacific"
        if -180.0 <= longitude <= -75.0:
            return "eastern_pacific"
        if -100.0 <= longitude <= 0.0:
            return "north_atlantic"

    if -60.0 <= latitude < 0.0 and -180.0 <= longitude <= -60.0:
        return "south_pacific"

    return "global"


def gdacs_event_to_hazard_read(
    event: GDACSEvent,
    retrieval_time_utc: datetime | None = None,
) -> HazardRead:
    """
    Map a validated GDACSEvent to the canonical HazardRead schema.
    Converts live centroid fix to an initial HazardTrack point with is_forecast=False.
    """
    now_utc = retrieval_time_utc or datetime.now(UTC)
    hazard_id = (
        f"hz-{event.event_id}"
        if not event.event_id.startswith("hz-")
        else event.event_id
    )

    # Observation time prioritizes to_date (latest position) or modified_date
    obs_time = event.to_date or event.modified_date or event.from_date or now_utc
    if obs_time.tzinfo is None:
        obs_time = obs_time.replace(tzinfo=UTC)

    track_points: list[HazardTrackPoint] = []
    if event.latitude is not None and event.longitude is not None:
        track_points.append(
            HazardTrackPoint(
                time=obs_time,
                latitude=event.latitude,
                longitude=event.longitude,
                wind_speed_knots=event.severity_knots,
                pressure_hpa=None,
                category=f"{event.alert_level} Alert",
                is_forecast=False,
            )
        )

    # Clean display name
    clean_name = (
        event.name.strip() if event.name else f"Tropical Cyclone {event.event_name}"
    )

    metadata_json = {
        "alert_level": event.alert_level,
        "alert_score": event.alert_score,
        "country": event.country,
        "gdacs_event_id": event.event_id.replace("gdacs-tc-", "").replace("hz-", ""),
        "severity_kmh": event.severity_kmh,
        "severity_knots": event.severity_knots,
        "severity_text": event.severity_text,
        "report_url": event.report_url,
        "source_updated_at": event.modified_date.isoformat()
        if event.modified_date
        else None,
        "retrieval_timestamp_utc": now_utc.isoformat(),
    }

    return HazardRead(
        hazard_id=hazard_id,
        name=clean_name,
        type="cyclone",
        source="GDACS",
        basin=infer_cyclone_basin(event.latitude, event.longitude),
        status="active",
        first_observed=event.from_date,
        last_observed=obs_time,
        track_points=track_points,
        metadata_json=metadata_json,
    )


_GDACS_FEED_CACHE: dict[str, Any] = {"data": None, "timestamp": 0.0}
_GDACS_FEED_TTL: float = 600.0  # 10 minutes cache


class GDACSClient:
    """
    Client for retrieving active disaster alerts and tropical cyclone tracks from GDACS.
    API: Global Disaster Alert and Coordination System (UN / EU)
    Endpoint: https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC
    """

    BASE_URL: str = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP"

    def __init__(
        self,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
    ):
        raw_timeout = timeout_seconds or float(
            settings.EXTERNAL_REQUEST_TIMEOUT_SECONDS
        )
        self.timeout = min(raw_timeout, 3.5)
        self.max_retries = min(
            max_retries if max_retries is not None else settings.MAX_PROVIDER_RETRIES, 1
        )

    async def fetch_active_tropical_cyclones(self) -> list[GDACSEvent]:
        """
        Fetch and parse currently active tropical cyclones from GDACS.
        Backward-compatible method returning validated GDACSEvent objects.
        """
        _, report = await self.fetch_and_validate_active_cyclones()
        return report.events

    async def fetch_and_validate_active_cyclones(
        self,
    ) -> tuple[list[HazardRead], GDACSValidationReport]:
        """
        Fetch, validate, and normalize live tropical cyclone alerts from GDACS.
        Returns canonical HazardRead models and an auditable GDACSValidationReport.
        """
        data = await self._fetch_feed_data()
        now_utc = datetime.now(UTC)
        events, report = self.parse_and_validate_geojson(data)

        hazard_reads: list[HazardRead] = [
            gdacs_event_to_hazard_read(ev, retrieval_time_utc=now_utc) for ev in events
        ]
        return hazard_reads, report

    async def _fetch_feed_data(self) -> dict[str, Any]:
        """Execute HTTP GET with in-memory TTL caching, bounded retries, and timeout protection."""
        now_ts = datetime.now(UTC).timestamp()
        if (
            _GDACS_FEED_CACHE["data"] is not None
            and (now_ts - _GDACS_FEED_CACHE["timestamp"]) < _GDACS_FEED_TTL
        ):
            logger.info("Serving GDACS live feed from in-memory cache (fresh within 10m TTL)")
            return _GDACS_FEED_CACHE["data"]

        params = {"eventtype": "TC"}
        logger.info(
            f"Connecting to GDACS live feed: {self.BASE_URL} (timeout={self.timeout}s)"
        )

        attempts = 0
        last_exception: Exception | None = None

        while attempts <= self.max_retries:
            attempts += 1
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(self.BASE_URL, params=params)
                    raw_code = getattr(response, "status_code", 200)
                    try:
                        status_code = int(raw_code)
                    except (ValueError, TypeError):
                        status_code = 200

                    if status_code == 429:
                        if _GDACS_FEED_CACHE["data"] is not None:
                            logger.warning("GDACS 429 received; serving cached feed.")
                            return _GDACS_FEED_CACHE["data"]
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
                            f"GDACS rate limit (429) hit on attempt {attempts}. Backing off for {delay:.2f}s..."
                        )
                        if attempts <= self.max_retries:
                            await asyncio.sleep(delay)
                            continue
                        raise httpx.HTTPStatusError(
                            "GDACS rate limit exceeded (429)",
                            request=response.request,
                            response=response,
                        )

                    if status_code >= 500:
                        response.raise_for_status()
                    elif status_code >= 400:
                        raise RuntimeError(
                            f"GDACS API returned client error {status_code}"
                        )

                    try:
                        parsed = response.json()
                        _GDACS_FEED_CACHE["data"] = parsed
                        _GDACS_FEED_CACHE["timestamp"] = now_ts
                        return parsed
                    except Exception as json_err:
                        raise ValueError(
                            f"GDACS API returned malformed JSON response: {json_err}"
                        ) from json_err

            except (
                httpx.TimeoutException,
                httpx.NetworkError,
                httpx.HTTPStatusError,
            ) as exc:
                last_exception = exc
                if _GDACS_FEED_CACHE["data"] is not None:
                    logger.warning(
                        f"GDACS live request failed ({exc}); serving cached feed snapshot."
                    )
                    return _GDACS_FEED_CACHE["data"]

                if (
                    isinstance(exc, httpx.HTTPStatusError)
                    and exc.response.status_code < 500
                    and exc.response.status_code != 429
                ):
                    raise RuntimeError(
                        f"GDACS API returned client error {exc.response.status_code}"
                    ) from exc

                if attempts <= self.max_retries:
                    backoff = min(
                        settings.MAX_RETRY_DELAY_SECONDS,
                        settings.RETRY_BASE_DELAY_SECONDS * (2 ** (attempts - 1))
                        + random.uniform(0.05, 0.15),
                    )
                    logger.warning(
                        f"GDACS request attempt {attempts}/{self.max_retries + 1} failed: {exc}. Retrying in {backoff:.2f}s..."
                    )
                    await asyncio.sleep(backoff)
                else:
                    logger.error(
                        f"GDACS request permanently failed after {self.max_retries + 1} attempts: {exc}"
                    )

        if _GDACS_FEED_CACHE["data"] is not None:
            return _GDACS_FEED_CACHE["data"]

        match last_exception:
            case httpx.TimeoutException():
                raise TimeoutError(
                    f"GDACS service request timed out after {self.timeout} seconds."
                ) from last_exception
            case httpx.HTTPStatusError():
                raise RuntimeError(
                    f"GDACS API returned status {last_exception.response.status_code}"
                ) from last_exception
            case _:
                raise RuntimeError(
                    f"Failed to connect to GDACS service: {last_exception}"
                ) from last_exception

    def parse_and_validate_geojson(
        self, data: dict[str, Any]
    ) -> tuple[list[GDACSEvent], GDACSValidationReport]:
        """
        Parse GDACS GeoJSON feature collection.
        Validates identifiers, coordinate bounds, timestamps, and severity metrics.
        """
        features = data.get("features", [])
        retrieved_count = len(features)

        # Detect if features contain Point_Centroid classes (as in real GDACS MAP feed)
        has_centroids = any(
            feat.get("properties", {}).get("Class") == "Point_Centroid"
            for feat in features
            if isinstance(feat, dict)
        )

        candidates = [
            feat
            for feat in features
            if isinstance(feat, dict)
            and (
                not has_centroids
                or feat.get("properties", {}).get("Class") == "Point_Centroid"
            )
        ]

        report = GDACSValidationReport(retrieved_count=retrieved_count)
        dedup_events: dict[str, GDACSEvent] = {}

        for feat in candidates:
            props = feat.get("properties")
            if not isinstance(props, dict):
                report.rejected_count += 1
                report.rejection_reasons.append("Feature missing properties object")
                continue

            raw_eid = props.get("eventid")
            if raw_eid is None or str(raw_eid).strip() == "":
                report.rejected_count += 1
                report.rejection_reasons.append("Feature missing eventid")
                continue

            event_id_str = str(raw_eid).strip()

            # Coordinates validation
            geom = feat.get("geometry")
            latitude: float | None = None
            longitude: float | None = None

            if isinstance(geom, dict) and geom.get("type") == "Point":
                coords = geom.get("coordinates")
                if (
                    isinstance(coords, (list, tuple))
                    and len(coords) >= 2
                    and isinstance(coords[0], (int, float))
                    and isinstance(coords[1], (int, float))
                ):
                    raw_lon = float(coords[0])
                    raw_lat = float(coords[1])
                    if -90.0 <= raw_lat <= 90.0 and -180.0 <= raw_lon <= 180.0:
                        latitude = raw_lat
                        longitude = raw_lon
                    else:
                        report.rejection_reasons.append(
                            f"Event {event_id_str}: coordinates [{raw_lat}, {raw_lon}] out of geographic range"
                        )

            # Timestamps parsing & UTC normalization
            from_dt = self._parse_iso_utc(props.get("fromdate"))
            to_dt = self._parse_iso_utc(props.get("todate"))
            mod_dt = self._parse_iso_utc(props.get("datemodified"))

            # Severity extraction & conversion to knots (1 km/h = 0.539957 knots)
            sev_data = (
                props.get("severitydata", {})
                if isinstance(props.get("severitydata"), dict)
                else {}
            )
            raw_sev = sev_data.get("severity")
            severity_kmh: float | None = None
            severity_knots: float | None = None

            if raw_sev is not None:
                try:
                    severity_kmh = float(raw_sev)
                    severity_knots = round(severity_kmh * 0.539957, 1)
                except (ValueError, TypeError):
                    severity_kmh = None

            severity_text = str(sev_data.get("severitytext", "")).strip()

            # URLs
            urls = props.get("url") if isinstance(props.get("url"), dict) else {}
            report_url = urls.get("report") if isinstance(urls, dict) else None

            # Alert level
            alert_level = str(props.get("alertlevel", "Green")).capitalize()
            if alert_level not in {"Green", "Orange", "Red"}:
                alert_level = "Green"

            alert_score = 0.0
            try:
                alert_score = float(props.get("alertscore", 0.0) or 0.0)
            except (ValueError, TypeError):
                pass

            event_obj = GDACSEvent(
                event_id=f"gdacs-tc-{event_id_str}",
                event_name=str(props.get("eventname") or f"TC-{event_id_str}").strip(),
                name=str(
                    props.get("name") or props.get("eventname") or "Tropical Cyclone"
                ).strip(),
                alert_level=alert_level,
                alert_score=alert_score,
                latitude=latitude,
                longitude=longitude,
                from_date=from_dt,
                to_date=to_dt,
                modified_date=mod_dt,
                country=str(props.get("country", "")).strip(),
                severity_kmh=severity_kmh,
                severity_knots=severity_knots,
                severity_text=severity_text,
                report_url=report_url,
                is_current=str(props.get("iscurrent", "true")).lower() == "true",
                geometry=geom if isinstance(geom, dict) else None,
            )

            # Deduplicate by event_id, keeping the latest modified record
            if event_obj.event_id not in dedup_events:
                dedup_events[event_obj.event_id] = event_obj
            else:
                existing = dedup_events[event_obj.event_id]
                existing_time = existing.modified_date or existing.to_date
                new_time = event_obj.modified_date or event_obj.to_date
                if new_time and (existing_time is None or new_time > existing_time):
                    dedup_events[event_obj.event_id] = event_obj

        final_events = list(dedup_events.values())
        report.validated_count = len(final_events)
        report.events = final_events

        logger.info(
            f"GDACS feed processed: {retrieved_count} raw features -> {report.validated_count} validated events "
            f"({report.rejected_count} rejected/filtered)"
        )
        return final_events, report

    @staticmethod
    def _parse_iso_utc(date_str: Any) -> datetime | None:
        """Safely parse an ISO date string to timezone-aware UTC datetime."""
        if not date_str or not isinstance(date_str, str):
            return None
        try:
            # Handle potential trailing Z or offsets
            dt = datetime.fromisoformat(date_str.strip())
            return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)
        except (ValueError, TypeError):
            return None
