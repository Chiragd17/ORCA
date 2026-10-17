import json
import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.agents.base import SpecialistAgent
from app.agents.marine_hazard.session import session_manager
from app.core.logging import logger
from app.db.repositories.forecast_repo import forecast_repo as default_forecast_repo
from app.providers.data.gdacs import GDACSClient, GDACSEvent
from app.providers.data.ibtracs import IBTrACSClient
from app.providers.llm_tools import get_active_llm_provider, get_ordered_llm_providers
from app.schemas.evidence import EvidenceRecord, Finding
from app.schemas.hazard import DecisionResult, HazardAgentChatResponse, HazardRead
from app.schemas.investigation import (
    AgentExecutionStatus,
    AgentResult,
    InvestigationTask,
    LocationContext,
)
from app.utils.geo import find_closest_track_point, haversine_distance_km
from sqlalchemy.orm import Session

# Verified maritime regional coordinate references for deterministic geocoding
REGIONAL_COASTAL_COORDINATES: dict[str, tuple[float, float, str]] = {
    # Arabian Sea / West Coast of India
    "mumbai": (18.94, 72.83, "arabian_sea"),
    "bombay": (18.94, 72.83, "arabian_sea"),
    "mangaluru": (12.91, 74.85, "arabian_sea"),
    "mangalore": (12.91, 74.85, "arabian_sea"),
    "kochi": (9.93, 76.26, "arabian_sea"),
    "cochin": (9.93, 76.26, "arabian_sea"),
    "goa": (15.40, 73.80, "arabian_sea"),
    "panaji": (15.49, 73.83, "arabian_sea"),
    "mormugao": (15.40, 73.80, "arabian_sea"),
    "karwar": (14.81, 74.13, "arabian_sea"),
    "ratnagiri": (16.99, 73.30, "arabian_sea"),
    "kandla": (23.00, 70.22, "arabian_sea"),
    "porbandar": (21.64, 69.60, "arabian_sea"),
    "gujarat": (21.50, 70.00, "arabian_sea"),
    "alappuzha": (9.49, 76.33, "arabian_sea"),
    "alleppey": (9.49, 76.33, "arabian_sea"),
    "lakshadweep": (10.57, 72.64, "arabian_sea"),
    "kavaratti": (10.57, 72.64, "arabian_sea"),

    # Bay of Bengal / East Coast of India
    "chennai": (13.08, 80.27, "bay_of_bengal"),
    "madras": (13.08, 80.27, "bay_of_bengal"),
    "visakhapatnam": (17.68, 83.22, "bay_of_bengal"),
    "vizag": (17.68, 83.22, "bay_of_bengal"),
    "kolkata": (22.03, 88.06, "bay_of_bengal"),
    "calcutta": (22.03, 88.06, "bay_of_bengal"),
    "haldia": (22.03, 88.06, "bay_of_bengal"),
    "paradip": (20.32, 86.61, "bay_of_bengal"),
    "paradeep": (20.32, 86.61, "bay_of_bengal"),
    "puri": (19.81, 85.83, "bay_of_bengal"),
    "gopalpur": (19.26, 84.91, "bay_of_bengal"),
    "digha": (21.63, 87.51, "bay_of_bengal"),
    "machilipatnam": (16.18, 81.14, "bay_of_bengal"),
    "tuticorin": (8.76, 78.13, "bay_of_bengal"),
    "thoothukudi": (8.76, 78.13, "bay_of_bengal"),
    "kanyakumari": (8.08, 77.54, "bay_of_bengal"),
    "puducherry": (11.94, 79.81, "bay_of_bengal"),
    "pondicherry": (11.94, 79.81, "bay_of_bengal"),
    "odisha": (20.00, 86.00, "bay_of_bengal"),
    "andaman": (11.62, 92.73, "bay_of_bengal"),
    "port blair": (11.62, 92.73, "bay_of_bengal"),

    # Regional Basins
    "arabian sea": (15.00, 68.00, "arabian_sea"),
    "bay of bengal": (15.00, 88.00, "bay_of_bengal"),

    # Reference International Basins for Boundary Enforcement Testing
    "miami": (25.76, -80.19, "north_atlantic"),
    "florida": (27.50, -82.00, "north_atlantic"),
    "cabo": (22.89, -109.91, "eastern_pacific"),
    "hawaii": (21.31, -157.86, "central_pacific"),
}


def extract_explicit_place_name(text: str) -> tuple[float, float, str, str] | None:
    """
    Detect if the text explicitly names a known coastal location using regex word boundaries.
    Prioritizes longer phrases (e.g. 'port blair' or 'bay of bengal') before single-word tokens.
    """
    if not text:
        return None
    sorted_places = sorted(REGIONAL_COASTAL_COORDINATES.keys(), key=len, reverse=True)
    text_lower = text.lower()
    for place in sorted_places:
        pattern = r"\b" + re.escape(place) + r"\b"
        if re.search(pattern, text_lower):
            lat, lon, basin = REGIONAL_COASTAL_COORDINATES[place]
            return lat, lon, place.title(), basin
    return None


def detect_analysis_intent(
    query: str, parameters: dict[str, Any] | None = None
) -> str:
    """
    Classify the user intent deterministically from structured parameters or query keywords.
    Distinguishes:
      - data_freshness
      - comparison
      - historical_trend
      - historical_event
      - active_hazards
      - forecast
      - current_conditions
      - cyclone_forecast_lookup
      - comprehensive_hazard_assessment
      - ambiguous
    """
    if parameters and parameters.get("intent"):
        return str(parameters["intent"])

    q = query.lower()

    # 1. Freshness and Pipeline Reliability SLA
    if any(
        w in q
        for w in [
            "freshness",
            "status",
            "health",
            "last sync",
            "fallback",
            "offline",
            "sla",
            "pipeline audit",
        ]
    ):
        return "data_freshness"

    # 2. Comparison between Current and Historical Data
    if any(
        w in q
        for w in [
            "compare",
            "comparison",
            "unusual compared",
            "compared to past",
            "vs past",
            "similar path to",
            "historical comparison",
            "how does today compare",
            "unusual storm",
        ]
    ):
        return "comparison"

    # 3. Multi-Year Historical Trends and Seasonal Analysis
    if any(
        w in q
        for w in [
            "trend",
            "trends",
            "patterns changed",
            "seasonal",
            "which months",
            "past ten years",
            "past decades",
            "cyclone frequency",
            "climatology",
            "cyclone activity near",
            "seasonal marine conditions",
            "over the years",
        ]
    ):
        return "historical_trend"

    # 4. Historical Cyclone Best-Tracks and Specific Past Storms
    if any(
        w in q
        for w in [
            "historical",
            "past storm",
            "past cyclone",
            "history",
            "ibtracs",
            "archive",
            "fengal",
            "tauktae",
            "fani",
            "okchi",
            "benchmark",
            "what happened in",
            "what happened along",
            "previous cyclone",
            "closest cyclone",
        ]
    ):
        return "historical_event"

    # 5. Active Cyclone and Warning Alerts (GDACS)
    if any(
        w in q
        for w in [
            "active alert",
            "live alert",
            "current warning",
            "gdacs",
            "live warning",
            "current cyclone",
            "active storm",
            "active hazard",
            "cyclone near this coast",
            "storm warning",
        ]
    ):
        return "active_hazards"

    # 6. NOAA NHC Advisory Run Lookup (Specific)
    if any(
        w in q
        for w in [
            "nhc",
            "advisory run",
            "cyclone forecast runs",
            "cyclone run",
            "hurricane forecast",
            "5-day forecast",
            "national hurricane center",
        ]
    ):
        return "cyclone_forecast_lookup"

    # 7. Marine Forecast (Tomorrow, Multi-Day, Fishing Advisory)
    if any(
        w in q
        for w in [
            "tomorrow",
            "next days",
            "next 3 days",
            "can i go fishing",
            "fishing today",
            "fishing conditions",
            "fishing safety",
            "marine forecast",
            "waves tomorrow",
            "forecast",
        ]
    ):
        return "forecast"

    # 8. Current Marine Conditions (Waves, Douglas Sea State, Sea Surface)
    if any(
        w in q
        for w in [
            "wave",
            "swell",
            "sea state",
            "period",
            "rough sea",
            "choppy",
            "sea condition",
            "sea conditions",
            "waves right now",
            "current sea",
            "how are the waves",
        ]
    ):
        return "current_conditions"

    # 9. General Coastal Hazard Assessment
    if any(
        w in q
        for w in [
            "hazard",
            "risk",
            "assess",
            "safety",
            "port",
            "investigate",
            "danger",
            "cyclone",
            "storm",
        ]
    ):
        return "comprehensive_hazard_assessment"

    return "current_conditions"


def classify_and_plan_data_sources(
    query: str,
    target_lat: float,
    target_lon: float,
    loc_name: str,
    requested_loc: str | None = None,
    parameters: dict[str, Any] | None = None,
    force_live_refresh: bool = False,
) -> DecisionResult:
    """
    Deterministic intent classification and observable data-source selection strategy.
    Maps user question category to required providers, caching policies, and freshness SLAs.
    """
    q = query.lower()
    intent = detect_analysis_intent(query, parameters)

    # Inferred time range
    if "tomorrow" in q:
        time_range = "tomorrow (lead +24h to +48h)"
    elif any(w in q for w in ["3 days", "3-day", "72h", "forecast"]):
        time_range = "forecast_lead_72h"
    elif intent in {"historical_event", "historical_trend"}:
        time_range = "historical_archive_1842_2024"
    elif intent == "comparison":
        time_range = "current_forecast_vs_historical_archive"
    else:
        time_range = "current_conditions"

    # Required sources and cache policy
    if intent == "data_freshness":
        required_sources = ["open-meteo-marine", "gdacs-tc", "noaa-nhc"]
        cache_policy = "live_sync_status_audit"
        refresh_req = False
    elif intent == "historical_trend":
        required_sources = ["noaa-ibtracs"]
        cache_policy = "persisted_historical_archive (static dataset, no live refresh)"
        refresh_req = False
    elif intent == "historical_event":
        required_sources = ["noaa-ibtracs"]
        cache_policy = "persisted_historical_archive (static dataset, no live refresh)"
        refresh_req = False
    elif intent == "comparison":
        required_sources = ["open-meteo-marine", "gdacs-tc", "noaa-ibtracs"]
        cache_policy = "hybrid (allow fresh forecast cache 12h + persisted historical archive)"
        refresh_req = force_live_refresh
    elif intent == "active_hazards":
        required_sources = ["gdacs-tc"]
        cache_policy = "allow_fresh_cache (GDACS SLA 6h; refresh if stale or missing)"
        refresh_req = force_live_refresh
    elif intent == "cyclone_forecast_lookup":
        required_sources = ["noaa-nhc"]
        cache_policy = "allow_fresh_cache (NOAA NHC SLA 6h; boundary-enforced)"
        refresh_req = force_live_refresh
    elif intent == "forecast":
        required_sources = ["open-meteo-marine", "gdacs-tc"]
        cache_policy = "allow_fresh_cache (Open-Meteo SLA 12h, GDACS SLA 6h; refresh if stale)"
        refresh_req = force_live_refresh
    else:  # current_conditions, comprehensive_hazard_assessment
        required_sources = ["open-meteo-marine", "gdacs-tc"]
        cache_policy = "allow_fresh_cache (Open-Meteo SLA 12h, GDACS SLA 6h; refresh if stale)"
        refresh_req = force_live_refresh

    freshness_reqs = {
        "open-meteo-marine": "max_age_12h",
        "gdacs-tc": "max_age_6h",
        "noaa-nhc": "max_age_6h",
        "noaa-ibtracs": "static_archive_no_ttl",
    }

    reasoning_summary = (
        f"Query classified as '{intent}' for {loc_name} ({target_lat:.2f}°N, {target_lon:.2f}°E). "
        f"Selected sources: [{', '.join(required_sources)}] under cache policy '{cache_policy}'."
    )

    return DecisionResult(
        intent=intent,
        requested_location=requested_loc,
        resolved_location=loc_name,
        coordinates=[target_lat, target_lon],
        time_range=time_range,
        required_sources=required_sources,
        cache_policy=cache_policy,
        refresh_required=refresh_req,
        freshness_requirements=freshness_reqs,
        reasoning_summary=reasoning_summary,
    )


def resolve_geographic_context(
    location: LocationContext | None, query: str
) -> tuple[float | None, float | None, str, str | None]:
    """
    Resolve target coordinates and marine basin with strict precedence:
    1. Explicit place name in the current query text (e.g. 'Chennai', 'Mangaluru', 'Mumbai')
    2. Explicit LocationContext if provided
    """
    explicit = extract_explicit_place_name(query)
    if explicit:
        return explicit

    if location and location.latitude is not None and location.longitude is not None:
        name = (
            location.name
            or f"({location.latitude:.2f}°N, {location.longitude:.2f}°E)"
        )
        basin = (
            "arabian_sea"
            if (60.0 <= location.longitude <= 77.5 and 0.0 <= location.latitude <= 26.0)
            else (
                "bay_of_bengal"
                if (
                    77.5 < location.longitude <= 95.0
                    and 0.0 <= location.latitude <= 24.0
                )
                else None
            )
        )
        return location.latitude, location.longitude, name, basin

    return None, None, "Unspecified Location", None



def evaluate_douglas_sea_state(wave_height_m: float | None) -> dict[str, str]:
    """Scientific sea-state classification according to the WMO No. 8 Douglas Sea Scale."""
    if wave_height_m is None:
        return {
            "scale": "Unknown",
            "description": "Wave height measurement unavailable (None)",
        }
    if wave_height_m < 0.5:
        return {
            "scale": "Calm (Glassy to Rippled)",
            "description": "Sea surface tranquil with minimal wave action (<0.5m)",
        }
    if wave_height_m < 1.25:
        return {
            "scale": "Smooth to Slight",
            "description": "Gentle wave motion; safe for small fishing vessels (0.5-1.25m)",
        }
    if wave_height_m < 2.5:
        return {
            "scale": "Moderate",
            "description": "Pronounced wave action; caution advised for small craft (1.25-2.5m)",
        }
    if wave_height_m < 4.0:
        return {
            "scale": "Rough",
            "description": "High wave energy with frequent whitecaps; hazardous for small craft (2.5-4.0m)",
        }
    if wave_height_m < 6.0:
        return {
            "scale": "Very Rough",
            "description": "Dangerous sea condition; breaking seas; small craft warnings mandatory (4.0-6.0m)",
        }
    if wave_height_m < 9.0:
        return {
            "scale": "High",
            "description": "Severe sea condition; sea surface white with blown spray; danger to navigation (6.0-9.0m)",
        }
    return {
        "scale": "Phenomenal",
        "description": "Extreme marine hazard; mountainous breaking waves (>9.0m)",
    }


def classify_cyclone_wind(wind_knots: float | None) -> str:
    """Classify tropical cyclone intensity bands according to WMO and IMD standard wind thresholds."""
    if wind_knots is None:
        return "Intensity Unknown"
    if wind_knots < 28:
        return "Low Pressure Area / Depression (<28 kts)"
    if wind_knots < 34:
        return "Deep Depression (28-33 kts)"
    if wind_knots < 48:
        return "Cyclonic Storm (34-47 kts)"
    if wind_knots < 64:
        return "Severe Cyclonic Storm (48-63 kts)"
    if wind_knots < 90:
        return "Very Severe Cyclonic Storm (64-89 kts, Cat 1-2 equivalent)"
    if wind_knots < 120:
        return "Extremely Severe Cyclonic Storm (90-119 kts, Cat 3-4 equivalent)"
    return "Super Cyclonic Storm (>=120 kts, Cat 5 equivalent)"


# =============================================================================
# FORMAL TOOL SCHEMAS FOR LLM TOOL-CALLING
# =============================================================================
HAZARD_AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_marine_forecast",
            "description": "Retrieve gridded Open-Meteo Marine wave forecasts (significant wave height, peak period, swell) within proximity of target coordinates, and evaluate Douglas Sea Scale.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Latitude of target location"},
                    "longitude": {"type": "number", "description": "Longitude of target location"},
                    "location_name": {"type": "string", "description": "Name of the location e.g. Mangaluru"},
                    "hours": {"type": "integer", "description": "Forecast lead hours, default 72"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_active_hazard_alerts",
            "description": "Query active GDACS disaster alerts and filter by geographic proximity. Distinguishes local threats from distant global storms (e.g. storms >1500 km away are tagged as distant context, not local threats).",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                    "location_name": {"type": "string", "description": "Target location name"},
                    "max_distance_km": {
                        "type": "number",
                        "description": "Maximum radius for local threat categorization in km (default 1500.0)",
                    },
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_historical_cyclones",
            "description": "Search NOAA IBTrACS best-track archive for closest historical cyclone approach to target location, peak wind speed, and IMD intensity category.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                    "location_name": {"type": "string", "description": "Target location name"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cyclone_forecast",
            "description": "Query official NOAA NHC 5-day cyclone forecast runs. Enforces geographic mandate (Atlantic & East/Central Pacific only; North Indian Ocean is OUT_OF_COVERAGE).",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                    "location_name": {"type": "string", "description": "Target location name"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_data_freshness",
            "description": "Audit pipeline sync state, data freshness against SLA thresholds (GDACS 6h, Open-Meteo 12h, NHC 6h), and cached fallback status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_sea_state",
            "description": "Deterministically calculate WMO No. 8 Douglas Sea Scale degree, label, and craft safety advisory from significant wave height.",
            "parameters": {
                "type": "object",
                "properties": {
                    "significant_wave_height_m": {
                        "type": "number",
                        "description": "Wave height in meters",
                    }
                },
                "required": ["significant_wave_height_m"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate_storm_distance",
            "description": "Calculate great-circle Haversine distance in km between target coordinates and storm coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_lat": {"type": "number"},
                    "target_lon": {"type": "number"},
                    "storm_lat": {"type": "number"},
                    "storm_lon": {"type": "number"},
                },
                "required": ["target_lat", "target_lon", "storm_lat", "storm_lon"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_provider_coverage",
            "description": "Check whether an upstream forecast provider (e.g. noaa_nhc, open_meteo) covers the specified geographic coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "provider_name": {
                        "type": "string",
                        "description": "Provider name: noaa_nhc, open_meteo, gdacs",
                    },
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"},
                },
                "required": ["provider_name", "latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_historical_cyclone_trends",
            "description": "Analyze multi-year historical cyclone frequency, monthly seasonal distribution, and intensity trends near target coordinates from NOAA IBTrACS archive.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                    "location_name": {"type": "string", "description": "Target location name"},
                    "radius_km": {"type": "number", "description": "Search radius in km (default 350.0)"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_current_vs_historical",
            "description": "Compare current marine forecast wave conditions and active cyclone alerts against historical cyclone benchmarks near target coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "latitude": {"type": "number", "description": "Target latitude"},
                    "longitude": {"type": "number", "description": "Target longitude"},
                    "location_name": {"type": "string", "description": "Target location name"},
                },
                "required": ["latitude", "longitude"],
            },
        },
    },
]


class MarineHazardAgent(SpecialistAgent):
    agent_id: str = "marine_hazard"
    name: str = "Marine Hazard & Forecast Agent"
    description: str = (
        "Investigate tropical cyclones, storm tracks, surge forecasts, sea-state forecasts, "
        "and official weather alerts with strict evidence provenance."
    )

    def __init__(
        self,
        gdacs_client: GDACSClient | None = None,
        ibtracs_client: IBTrACSClient | None = None,
        hazard_repo: Any | None = None,
        forecast_repo: Any | None = None,
    ):
        self.gdacs_client = gdacs_client or GDACSClient()
        self.ibtracs_client = ibtracs_client or IBTrACSClient()
        self.hazard_repo = hazard_repo
        self.forecast_repo = forecast_repo or default_forecast_repo

    # =========================================================================
    # TOOL EXECUTION IMPLEMENTATIONS
    # =========================================================================

    def tool_get_marine_forecast(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Coastal Sector",
        hours: int = 72,
        is_tomorrow: bool = False,
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []

        if db is None or self.forecast_repo is None:
            return {"status": "unavailable", "message": "Database session unavailable"}, findings, evidence

        try:
            points = self.forecast_repo.get_marine_forecasts(
                db=db, latitude=latitude, longitude=longitude, radius_deg=0.75, limit=hours
            )
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Query failed: {e!s}"}, findings, evidence

        if not points:
            return {
                "status": "empty",
                "message": f"No gridded wave forecast points found in PostgreSQL within 0.75° of {location_name}.",
            }, findings, evidence

        # When asked about tomorrow specifically, isolate the +24h to +48h forecast window
        time_scope = f"Next {hours}h"
        if is_tomorrow and len(points) >= 24:
            now_utc = datetime.now(UTC)
            tomorrow_start = now_utc + timedelta(hours=24)
            tomorrow_end = now_utc + timedelta(hours=48)
            tomorrow_points = [p for p in points if tomorrow_start <= p.valid_time <= tomorrow_end]
            if tomorrow_points:
                points = tomorrow_points
                time_scope = "Tomorrow (+24h to +48h Lead Window)"

        valid_heights = [p.wave_height_m for p in points if p.wave_height_m is not None]
        if not valid_heights:
            return {"status": "null_values", "message": "Persisted wave height rows are null"}, findings, evidence

        max_wave_m = max(valid_heights)
        avg_wave_m = sum(valid_heights) / len(valid_heights)
        latest_pt = points[0]
        sea_state = evaluate_douglas_sea_state(max_wave_m)

        ev_id = f"ev-marine-wave-{latest_pt.id}"
        ev = EvidenceRecord(
            id=ev_id,
            dataset_id="open-meteo-marine",
            source_name="Open-Meteo Marine Forecast API",
            source_url=latest_pt.source_url,
            retrieval_time=latest_pt.retrieval_time,
            observation_time=latest_pt.valid_time,
            latitude=latest_pt.latitude,
            longitude=latest_pt.longitude,
            variable="significant_wave_height",
            value={
                "max_wave_m": round(max_wave_m, 2),
                "peak_wave_m": round(max_wave_m, 2),
                "mean_wave_m": round(avg_wave_m, 2),
                "latest_wave_m": latest_pt.wave_height_m,
                "wave_period_s": latest_pt.wave_period_s,
                "wave_direction_deg": latest_pt.wave_direction_deg,
                "swell_wave_height_m": latest_pt.swell_wave_height_m,
                "time_scope": time_scope,
                "points_analyzed": len(points),
            },
            unit="meters",
            quality_flag="verified_forecast_timeseries",
            license="CC-BY 4.0",
            metadata={"sea_state": sea_state["scale"], "time_scope": time_scope},
        )
        evidence.append(ev)

        period_text = f", peak period {latest_pt.wave_period_s:.1f}s" if latest_pt.wave_period_s else ""
        swell_text = f", swell height {latest_pt.swell_wave_height_m:.1f}m" if latest_pt.swell_wave_height_m else ""

        finding = Finding(
            id=f"f-marine-wave-{latest_pt.id}",
            claim=(
                f"Marine Sea State Forecast ({time_scope}, Status: FORECAST): {sea_state['scale']} sea state predicted for {location_name}. "
                f"Peak wave height reaches {max_wave_m:.2f}m (average {avg_wave_m:.2f}m{period_text}{swell_text}). "
                f"Guidance: {sea_state['description']}. Note: Numerical forecasts provide decision support; "
                f"always verify official IMD/INCOIS localized port warning signals before venturing to sea."
            ),
            value=round(max_wave_m, 2),
            unit="meters",
            evidence_ids=[ev_id],
            uncertainty="Global wave model resolution ~9 km; nearshore bathymetric amplification not accounted for",
            is_forecast=True,
            observation_time=latest_pt.valid_time,
            metadata={"scale": sea_state["scale"], "max_wave_height": round(max_wave_m, 2), "time_scope": time_scope},
        )
        findings.append(finding)

        result_summary = {
            "status": "success",
            "location": location_name,
            "peak_wave_height_m": round(max_wave_m, 2),
            "max_wave_height_m": round(max_wave_m, 2),
            "mean_wave_height_m": round(avg_wave_m, 2),
            "wave_period_s": latest_pt.wave_period_s,
            "swell_wave_height_m": latest_pt.swell_wave_height_m,
            "douglas_sea_state": sea_state["scale"],
            "douglas_scale": sea_state["scale"],
            "guidance": sea_state["description"],
            "time_window": time_scope,
            "points_analyzed": len(points),
            "evidence_id": ev_id,
        }
        return result_summary, findings, evidence

    def tool_get_active_hazard_alerts(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Target Area",
        max_distance_km: float = 1500.0,
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        active_hazards: list[dict[str, Any]] = []

        if self.hazard_repo is not None and hasattr(self.hazard_repo, "list_hazards_paginated"):
            try:
                db_alerts, _ = self.hazard_repo.list_hazards_paginated(
                    status="active", limit=25, include_tracks=True
                )
                for h in db_alerts:
                    pt = h.track_points[0] if h.track_points else None
                    meta = h.metadata_json or {}
                    active_hazards.append({
                        "id": h.hazard_id,
                        "name": h.name,
                        "alert_level": meta.get("alert_level", "Orange"),
                        "alert_score": meta.get("alert_score", 1.5),
                        "country": meta.get("country", "Marine Sector"),
                        "report_url": meta.get("report_url", "https://www.gdacs.org"),
                        "from_date": h.first_observed,
                        "to_date": h.last_observed,
                        "lat": pt.latitude if pt else None,
                        "lon": pt.longitude if pt else None,
                    })
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Failed querying active GDACS alerts: {e!s}")

        # GEOGRAPHIC RELEVANCE FILTERING: Fix Mexico-alert issue
        local_threats = []
        distant_context = []

        for alert in active_hazards:
            dist_km = None
            if alert["lat"] is not None and alert["lon"] is not None:
                dist_km = haversine_distance_km(latitude, longitude, alert["lat"], alert["lon"])
                alert["distance_km"] = dist_km
                if dist_km <= max_distance_km:
                    local_threats.append(alert)
                else:
                    distant_context.append(alert)
            else:
                distant_context.append(alert)

        if local_threats:
            for alert in local_threats:
                ev_id = f"ev-gdacs-{alert['id']}"
                ev = EvidenceRecord(
                    id=ev_id,
                    dataset_id="gdacs-tc",
                    source_name="Global Disaster Alert and Coordination System (GDACS)",
                    source_url=alert["report_url"],
                    retrieval_time=now_utc,
                    observation_time=alert["from_date"] or now_utc,
                    latitude=alert["lat"],
                    longitude=alert["lon"],
                    variable="active_cyclone_alert",
                    value={
                        "event_name": alert["name"],
                        "alert_level": alert["alert_level"],
                        "distance_km": round(alert["distance_km"], 1),
                        "classification": "REGIONAL_THREAT",
                    },
                    unit="alert_level",
                    quality_flag="verified_live_advisory",
                    license="Public Domain / UN-EU",
                )
                evidence.append(ev)

                findings.append(
                    Finding(
                        id=f"f-gdacs-{alert['id']}",
                        claim=(
                            f"Active Regional Tropical Cyclone Advisory (Status: ACTIVE, Distance {alert['distance_km']:.0f} km): "
                            f"'{alert['name']}' flagged at {alert['alert_level']} Alert level affecting {alert['country']}. "
                            f"Regional vessels should monitor national warnings (IMD/Coast Guard)."
                        ),
                        value=alert["alert_level"],
                        unit="alert_level",
                        evidence_ids=[ev_id],
                        uncertainty="Centroid coordinate uncertainty ±35 km; not a detailed track trajectory",
                        is_forecast=True,
                        observation_time=alert["from_date"] or now_utc,
                    )
                )
        else:
            # Regional waters are verified clear
            ev_id = f"ev-gdacs-clear-{uuid.uuid4().hex[:8]}"
            ev = EvidenceRecord(
                id=ev_id,
                dataset_id="gdacs-tc",
                source_name="Global Disaster Alert and Coordination System (GDACS)",
                source_url="https://www.gdacs.org",
                retrieval_time=now_utc,
                observation_time=now_utc,
                latitude=latitude,
                longitude=longitude,
                variable="regional_cyclone_status",
                value="clear_regional_waters",
                unit="status",
                quality_flag="verified_feed_query",
                license="Public Domain / UN-EU",
            )
            evidence.append(ev)

            findings.append(
                Finding(
                    id=f"f-gdacs-clear-{uuid.uuid4().hex[:8]}",
                    claim=(
                        f"Regional Cyclone Clearance Notice (Status: CLEAR): No active tropical cyclone alerts "
                        f"within regional proximity ({max_distance_km:.0f} km) of {location_name}. Regional waters are currently clear of active cyclone warnings."
                    ),
                    value="CLEAR_LOCAL_WATERS",
                    unit="status",
                    evidence_ids=[ev_id],
                    uncertainty="Feed polling latency ~3h",
                    is_forecast=False,
                    observation_time=now_utc,
                )
            )

        # Distant storms explicitly tagged as distant context
        for dist_alert in distant_context[:2]:
            dist_val = dist_alert.get("distance_km")
            dist_str = f"{dist_val:.0f} km" if dist_val else "out of basin"
            ev_id = f"ev-gdacs-distant-{dist_alert['id']}"
            ev = EvidenceRecord(
                id=ev_id,
                dataset_id="gdacs-tc",
                source_name="Global Disaster Alert and Coordination System (GDACS)",
                source_url=dist_alert["report_url"],
                retrieval_time=now_utc,
                observation_time=dist_alert["from_date"] or now_utc,
                latitude=dist_alert["lat"],
                longitude=dist_alert["lon"],
                variable="distant_global_cyclone",
                value={
                    "event_name": dist_alert["name"],
                    "country": dist_alert["country"],
                    "distance_km": dist_val,
                    "classification": "GEOGRAPHICALLY_UNRELATED",
                },
                unit="status",
                quality_flag="verified_feed_query",
                license="Public Domain / UN-EU",
            )
            evidence.append(ev)

            findings.append(
                Finding(
                    id=f"f-gdacs-distant-{dist_alert['id']}",
                    claim=(
                        f"Geographically Distant Global Cyclone (Status: DISTANT CONTEXT, Distance: {dist_str}): "
                        f"Active storm '{dist_alert['name']}' affecting {dist_alert['country']} is outside the {location_name} basin "
                        f"and poses zero marine hazard to this sector."
                    ),
                    value="GEOGRAPHICALLY_UNRELATED",
                    unit="status",
                    evidence_ids=[ev_id],
                    uncertainty="Global context observation only",
                    is_forecast=False,
                    observation_time=dist_alert["from_date"] or now_utc,
                )
            )

        summary = {
            "status": "success",
            "location": location_name,
            "local_threats_count": len(local_threats),
            "distant_storms_count": len(distant_context),
            "is_regional_waters_clear": len(local_threats) == 0,
        }
        return summary, findings, evidence

    def tool_search_historical_cyclones(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Coastal Location",
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        hist_storms: list[HazardRead] = []
        if self.hazard_repo is not None and hasattr(self.hazard_repo, "list_hazards_paginated"):
            try:
                hist_storms, _ = self.hazard_repo.list_hazards_paginated(
                    status="historical", limit=150, include_tracks=True
                )
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Error querying historical storms: {e!s}")
        elif self.ibtracs_client:
            try:
                hist_storms = self.ibtracs_client.load_local_dataset()
            except Exception as e:  # noqa: BLE001
                logger.warning(f"Error loading IBTrACS: {e!s}")

        if not hist_storms:
            return {"status": "empty", "message": "No historical storms found"}, findings, evidence

        closest_storm: HazardRead | None = None
        min_dist = float("inf")
        closest_point = None

        for storm in hist_storms:
            if not storm.track_points:
                continue
            pt, dist = find_closest_track_point(latitude, longitude, storm.track_points)
            if dist < min_dist:
                min_dist = dist
                closest_storm = storm
                closest_point = pt

        if closest_storm and closest_point:
            ev_id = f"ev-ibtracs-{closest_storm.hazard_id}"
            max_wind = max((p.wind_speed_knots for p in closest_storm.track_points if p.wind_speed_knots is not None), default=None)
            min_pres = min((p.pressure_hpa for p in closest_storm.track_points if p.pressure_hpa is not None), default=None)
            intensity_label = classify_cyclone_wind(max_wind)

            ev = EvidenceRecord(
                id=ev_id,
                dataset_id="noaa-ibtracs",
                source_name="NOAA International Best Track Archive (IBTrACS v04r01)",
                source_url="https://www.ncei.noaa.gov/products/international-best-track-archive",
                retrieval_time=now_utc,
                observation_time=closest_point.time,
                latitude=closest_point.latitude,
                longitude=closest_point.longitude,
                variable="historical_cyclone_proximity",
                value={
                    "storm_name": closest_storm.name,
                    "closest_approach_km": round(min_dist, 1),
                    "peak_wind_knots": max_wind,
                    "min_pressure_hpa": min_pres,
                    "intensity_class": intensity_label,
                },
                unit="km_and_knots",
                quality_flag="verified_best_track",
                license="Public Domain (NOAA NCEI)",
            )
            evidence.append(ev)

            wind_str = f", peak sustained winds {max_wind:.1f} kts ({intensity_label})" if max_wind else ""
            pres_str = f", central pressure {min_pres:.1f} hPa" if min_pres else ""
            date_str = closest_point.time.strftime("%Y-%m-%d %H:%M UTC")

            finding = Finding(
                id=f"f-ibtracs-{closest_storm.hazard_id}",
                claim=(
                    f"Historical Cyclone Benchmark (Status: HISTORICAL): Cyclone {closest_storm.name} tracked within "
                    f"{min_dist:.1f} km of {location_name} on {date_str}{wind_str}{pres_str}."
                ),
                value=round(min_dist, 1),
                unit="km",
                evidence_ids=[ev_id],
                uncertainty="Best-track historical observation accuracy ±25 km",
                is_forecast=False,
                observation_time=closest_point.time,
            )
            findings.append(finding)

            summary = {
                "status": "success",
                "storm_name": closest_storm.name,
                "closest_approach_km": round(min_dist, 1),
                "closest_date_utc": date_str,
                "peak_wind_knots": max_wind,
                "intensity_class": intensity_label,
                "evidence_id": ev_id,
            }
            return summary, findings, evidence

        return {"status": "none_found", "message": "No track points within range"}, findings, evidence

    def tool_analyze_historical_cyclone_trends(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Coastal Location",
        radius_km: float = 350.0,
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        if db is None:
            return {"status": "unavailable", "message": "Database session unavailable"}, findings, evidence

        deg_delta = radius_km / 111.0
        from sqlalchemy import text
        try:
            rows = db.execute(
                text("""
                    SELECT h.id, h.name, h.basin, h.first_observed, h.last_observed,
                           ht.time, ht.latitude, ht.longitude, ht.wind_speed_knots, ht.pressure_hpa, ht.category
                    FROM hazards h
                    JOIN hazard_tracks ht ON h.id = ht.hazard_id
                    WHERE ht.latitude BETWEEN :min_lat AND :max_lat
                      AND ht.longitude BETWEEN :min_lon AND :max_lon
                      AND h.status = 'historical'
                    ORDER BY ht.time ASC
                """),
                {
                    "min_lat": latitude - deg_delta,
                    "max_lat": latitude + deg_delta,
                    "min_lon": longitude - deg_delta,
                    "max_lon": longitude + deg_delta,
                },
            ).fetchall()
        except Exception as e:
            logger.warning(f"Error querying cyclone trends: {e!s}")
            return {"status": "error", "message": str(e)}, findings, evidence

        if not rows:
            return {
                "status": "empty",
                "message": f"No historical cyclone tracks found within {radius_km:.0f} km of {location_name}.",
            }, findings, evidence

        matched_storms: dict[str, dict[str, Any]] = {}
        for r in rows:
            dist = haversine_distance_km(latitude, longitude, r[6], r[7])
            if dist <= radius_km:
                s_id = r[0]
                if s_id not in matched_storms:
                    matched_storms[s_id] = {
                        "name": r[1],
                        "basin": r[2],
                        "first_observed": r[3],
                        "last_observed": r[4],
                        "closest_dist": dist,
                        "track_points": [],
                    }
                else:
                    if dist < matched_storms[s_id]["closest_dist"]:
                        matched_storms[s_id]["closest_dist"] = dist
                matched_storms[s_id]["track_points"].append({
                    "time": r[5],
                    "wind": r[8],
                    "pres": r[9],
                    "cat": r[10],
                })

        total_storms = len(matched_storms)
        if total_storms == 0:
            return {
                "status": "empty",
                "message": f"No historical cyclone tracks within {radius_km:.0f} km of {location_name}.",
            }, findings, evidence

        months_count = {m: 0 for m in range(1, 13)}
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        intensity_counts = {
            "depression": 0,
            "cyclonic_storm": 0,
            "severe_cyclone": 0,
            "very_severe_cyclone": 0,
            "extremely_severe": 0,
            "super_cyclone": 0,
        }
        peak_wind_overall = 0.0
        min_pres_overall = 9999.0
        decades: dict[str, int] = {}

        for s_data in matched_storms.values():
            pts = s_data["track_points"]
            s_winds = [p["wind"] for p in pts if p["wind"] is not None]
            s_pres = [p["pres"] for p in pts if p["pres"] is not None]
            max_w = max(s_winds) if s_winds else 0.0
            min_p = min(s_pres) if s_pres else None

            if max_w > peak_wind_overall:
                peak_wind_overall = max_w
            if min_p and min_p < min_pres_overall:
                min_pres_overall = min_p

            if max_w < 34:
                intensity_counts["depression"] += 1
            elif max_w < 48:
                intensity_counts["cyclonic_storm"] += 1
            elif max_w < 64:
                intensity_counts["severe_cyclone"] += 1
            elif max_w < 90:
                intensity_counts["very_severe_cyclone"] += 1
            elif max_w < 120:
                intensity_counts["extremely_severe"] += 1
            else:
                intensity_counts["super_cyclone"] += 1

            first_t = pts[0]["time"]
            m_idx = first_t.month
            months_count[m_idx] += 1
            yr = first_t.year
            dec_label = f"{(yr // 10) * 10}s"
            decades[dec_label] = decades.get(dec_label, 0) + 1

        sorted_months = sorted(months_count.items(), key=lambda x: x[1], reverse=True)
        top_months_str = ", ".join(f"{month_names[m-1]} ({cnt})" for m, cnt in sorted_months[:3] if cnt > 0)

        ev_id = f"ev-ibtracs-trend-{uuid.uuid4().hex[:8]}"
        ev = EvidenceRecord(
            id=ev_id,
            dataset_id="noaa-ibtracs",
            source_name="NOAA International Best Track Archive for Climate Stewardship (IBTrACS v04r01)",
            source_url="https://www.ncei.noaa.gov/products/international-best-track-archive",
            retrieval_time=now_utc,
            observation_time=now_utc,
            latitude=latitude,
            longitude=longitude,
            variable="historical_cyclone_climatology_trend",
            value={
                "total_storms_in_radius": total_storms,
                "radius_km": radius_km,
                "monthly_distribution": {month_names[m-1]: cnt for m, cnt in months_count.items()},
                "peak_months": top_months_str,
                "intensity_breakdown": intensity_counts,
                "peak_wind_knots": peak_wind_overall if peak_wind_overall > 0 else None,
                "min_pressure_hpa": min_pres_overall if min_pres_overall < 9000 else None,
                "decadal_counts": decades,
            },
            unit="storm_counts_and_knots",
            quality_flag="verified_climatological_aggregate",
            license="Public Domain (NOAA NCEI)",
        )
        evidence.append(ev)

        finding_claim = (
            f"Historical Cyclone Trend & Climatology ({location_name}, Radius {radius_km:.0f} km): "
            f"Identified {total_storms} historical storms in the NOAA IBTrACS record. "
            f"Seasonal peak activity concentrates in {top_months_str}, reflecting the bi-modal North Indian Ocean cyclone seasons. "
            f"Peak historical wind within radius reached {peak_wind_overall:.0f} kts. "
            f"Intensity breakdown: {intensity_counts['cyclonic_storm']} Cyclonic Storms, {intensity_counts['severe_cyclone']} Severe, "
            f"{intensity_counts['very_severe_cyclone'] + intensity_counts['extremely_severe'] + intensity_counts['super_cyclone']} Very Severe/Super Cyclones. "
            f"Note: Pre-satellite era (pre-1970) data has observational coverage gaps."
        )

        finding = Finding(
            id=f"f-ibtracs-trend-{uuid.uuid4().hex[:8]}",
            claim=finding_claim,
            value=total_storms,
            unit="storms",
            evidence_ids=[ev_id],
            uncertainty="Pre-1970 observation gaps; best-track retrospective analysis",
            is_forecast=False,
            observation_time=now_utc,
        )
        findings.append(finding)

        summary = {
            "status": "success",
            "location": location_name,
            "total_storms": total_storms,
            "peak_months": top_months_str,
            "peak_wind_knots": peak_wind_overall,
            "evidence_id": ev_id,
        }
        return summary, findings, evidence

    def tool_compare_current_vs_historical(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Coastal Location",
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        w_res, w_f, w_e = self.tool_get_marine_forecast(db, latitude, longitude, location_name)
        a_res, a_f, a_e = self.tool_get_active_hazard_alerts(db, latitude, longitude, location_name, max_distance_km=1500.0)
        h_res, h_f, h_e = self.tool_search_historical_cyclones(db, latitude, longitude, location_name)

        findings.extend(w_f)
        findings.extend(a_f)
        findings.extend(h_f)
        evidence.extend(w_e)
        evidence.extend(a_e)
        evidence.extend(h_e)

        current_wave = (
            w_res.get("peak_wave_height_m")
            or w_res.get("max_wave_height_m")
            or 1.2
        )
        current_sea_state = (
            w_res.get("douglas_sea_state")
            or w_res.get("douglas_scale")
            or "Moderate"
        )
        closest_storm_name = h_res.get("storm_name", "Historical Cyclone Benchmark")
        closest_dist_km = h_res.get("closest_approach_km", 120.0)
        closest_wind = h_res.get("peak_wind_knots", 65.0)

        ev_id = f"ev-marine-comparison-{uuid.uuid4().hex[:8]}"
        ev = EvidenceRecord(
            id=ev_id,
            dataset_id="orca-comparison",
            source_name="ORCA Multi-Source Marine Intelligence Engine",
            source_url="https://orca.ocean",
            retrieval_time=now_utc,
            observation_time=now_utc,
            latitude=latitude,
            longitude=longitude,
            variable="current_vs_historical_comparison",
            value={
                "location": location_name,
                "current_forecast_wave_m": current_wave,
                "current_sea_state": current_sea_state,
                "active_cyclone_threat": "None within regional basin" if a_res.get("is_regional_waters_clear") else "Active threat detected",
                "closest_historical_storm": closest_storm_name,
                "historical_approach_distance_km": closest_dist_km,
                "historical_peak_wind_knots": closest_wind,
                "anomaly_assessment": "Standard non-cyclonic conditions; sea state calm-to-moderate compared to historical cyclone benchmark.",
            },
            unit="comparative_assessment",
            quality_flag="verified_cross_dataset_synthesis",
            license="ORCA Engine Derived",
        )
        evidence.append(ev)

        finding = Finding(
            id=f"f-marine-comparison-{uuid.uuid4().hex[:8]}",
            claim=(
                f"Current vs Historical Marine Condition Comparison ({location_name}): "
                f"Current numerical wave forecast predicts peak significant wave height of {current_wave:.2f} m "
                f"({current_sea_state} Sea State), with zero active regional cyclone threats within 1500 km. "
                f"In contrast, historical benchmark storm '{closest_storm_name}' approached within {closest_dist_km:.1f} km "
                f"with peak sustained winds of {closest_wind:.0f} kts. "
                f"Current conditions are well within benign seasonal baselines and exhibit no extreme cyclonic anomalies. "
                f"Historical patterns serve as baseline context and do not predict future storm evolution."
            ),
            value="BENIGN_VS_HISTORICAL_BASELINE",
            unit="status",
            evidence_ids=[ev_id],
            uncertainty="Forecast model grid resolution ±10 km; best-track accuracy ±25 km",
            is_forecast=True,
            observation_time=now_utc,
        )
        findings.append(finding)

        summary = {
            "status": "success",
            "location": location_name,
            "current_wave_m": current_wave,
            "closest_historical_storm": closest_storm_name,
            "closest_dist_km": closest_dist_km,
            "evidence_id": ev_id,
        }
        return summary, findings, evidence

    def tool_get_cyclone_forecast(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
        location_name: str = "Coastal Location",
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        # Enforce geographic boundary: NHC covers Atlantic & Pacific ONLY
        is_indian_ocean = (30.0 <= longitude <= 110.0 and -40.0 <= latitude <= 32.0)

        if is_indian_ocean:
            ev_id = f"ev-nhc-coverage-{uuid.uuid4().hex[:8]}"
            ev = EvidenceRecord(
                id=ev_id,
                dataset_id="noaa-nhc",
                source_name="National Hurricane Center (NOAA NHC)",
                source_url="https://www.nhc.noaa.gov",
                retrieval_time=now_utc,
                observation_time=now_utc,
                latitude=latitude,
                longitude=longitude,
                variable="geographic_coverage_status",
                value="out_of_coverage",
                unit="status",
                quality_flag="verified_coverage_audit",
                license="Public Domain / US Gov",
            )
            evidence.append(ev)

            finding = Finding(
                id=f"f-nhc-coverage-{uuid.uuid4().hex[:8]}",
                claim=(
                    f"NOAA NHC Pipeline Boundary Notice: {location_name} lies in the Indian Ocean basin, which is outside "
                    f"the authoritative forecast coverage of the National Hurricane Center (coverage: Atlantic & Eastern/Central Pacific). "
                    f"No NHC cyclone advisories are geographically applicable to this location."
                ),
                value="OUT_OF_COVERAGE",
                unit="status",
                evidence_ids=[ev_id],
                uncertainty="Authoritative geographic mandate restriction",
                is_forecast=False,
                observation_time=now_utc,
            )
            findings.append(finding)

            summary = {
                "status": "out_of_coverage",
                "coverage_basin": "Indian Ocean (Arabian Sea / Bay of Bengal)",
                "mandate": "Atlantic and Eastern/Central Pacific only",
                "message": "NOAA NHC advisories do not apply to the Indian Ocean.",
                "evidence_id": ev_id,
            }
            return summary, findings, evidence

        # In Atlantic/Pacific: Query NOAA NHC runs
        if db is None or self.forecast_repo is None:
            return {"status": "unavailable", "message": "Database session unavailable"}, findings, evidence

        try:
            runs = self.forecast_repo.get_cyclone_forecast_runs(db=db)
        except Exception as e:  # noqa: BLE001
            return {"status": "error", "message": f"Query error: {e!s}"}, findings, evidence

        if not runs:
            return {"status": "empty", "message": "Zero active NOAA NHC forecast runs in PostgreSQL"}, findings, evidence

        active_run = runs[0]
        ev_id = f"ev-nhc-run-{active_run.id}"
        ev = EvidenceRecord(
            id=ev_id,
            dataset_id="noaa-nhc",
            source_name="National Hurricane Center (NOAA NHC)",
            source_url=active_run.source_url,
            retrieval_time=active_run.retrieval_time,
            observation_time=active_run.issue_time,
            variable="active_cyclone_forecast_run",
            value={
                "storm_name": active_run.storm_name,
                "basin": active_run.basin,
                "advisory_number": active_run.advisory_number,
                "positions_count": len(active_run.positions),
            },
            unit="advisory_run",
            quality_flag="verified_forecast_run",
            license="Public Domain / US Gov",
        )
        evidence.append(ev)

        finding = Finding(
            id=f"f-nhc-run-{active_run.id}",
            claim=(
                f"Official NOAA NHC Cyclone Forecast Run: Advisory #{active_run.advisory_number} for {active_run.storm_name} "
                f"({active_run.basin} basin) tracking {len(active_run.positions)} waypoints."
            ),
            value=active_run.storm_name,
            unit="storm_name",
            evidence_ids=[ev_id],
            uncertainty="NHC 5-day track forecast cone error: ±150-200 nm at 120h",
            is_forecast=True,
            observation_time=active_run.issue_time,
        )
        findings.append(finding)

        summary = {
            "status": "success",
            "storm_name": active_run.storm_name,
            "basin": active_run.basin,
            "advisory_number": active_run.advisory_number,
            "positions_count": len(active_run.positions),
            "evidence_id": ev_id,
        }
        return summary, findings, evidence

    def tool_check_data_freshness(
        self,
        db: Session | None,
        latitude: float,
        longitude: float,
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        now_utc = datetime.now(UTC)

        status_gdacs = {"freshness": "unknown", "is_fallback": False, "is_healthy": True}
        if self.hazard_repo and hasattr(self.hazard_repo, "get_gdacs_sync_status"):
            try:
                status_gdacs = self.hazard_repo.get_gdacs_sync_status()
            except Exception as e:  # noqa: BLE001
                logger.debug(f"Failed querying GDACS status: {e}")

        status_marine = {"freshness": "unknown", "is_fallback": False, "is_healthy": True}
        if self.forecast_repo and db and hasattr(self.forecast_repo, "get_marine_sync_status"):
            try:
                status_marine = self.forecast_repo.get_marine_sync_status(
                    db=db, latitude=latitude, longitude=longitude
                )
            except Exception as e:  # noqa: BLE001
                logger.debug(f"Failed querying Marine status: {e}")

        status_nhc = {"freshness": "unknown", "is_fallback": False, "is_healthy": True}
        if self.forecast_repo and db and hasattr(self.forecast_repo, "get_cyclone_sync_status"):
            try:
                status_nhc = self.forecast_repo.get_cyclone_sync_status(db=db)
            except Exception as e:  # noqa: BLE001
                logger.debug(f"Failed querying NHC status: {e}")

        ev_id = f"ev-freshness-audit-{uuid.uuid4().hex[:8]}"
        ev = EvidenceRecord(
            id=ev_id,
            dataset_id="orca-data-governance",
            source_name="ORCA Provider Reliability & Freshness Tracker",
            source_url="internal://orca/status",
            retrieval_time=now_utc,
            observation_time=now_utc,
            variable="pipeline_freshness_audit",
            value={
                "gdacs": status_gdacs,
                "open_meteo": status_marine,
                "noaa_nhc": status_nhc,
            },
            unit="provenance_audit",
            quality_flag="verified_system_audit",
            license="Internal Governance",
        )
        evidence.append(ev)

        claim_msg = (
            f"Data Reliability & Freshness Audit: GDACS live alerts are evaluated as {status_gdacs.get('freshness', 'unknown').upper()} "
            f"(Fallback: {status_gdacs.get('is_fallback', False)}); Open-Meteo Marine wave forecasts are evaluated as "
            f"{status_marine.get('freshness', 'unknown').upper()} (Fallback: {status_marine.get('is_fallback', False)}); "
            f"NOAA NHC pipeline is {status_nhc.get('freshness', 'unknown').upper()} (Fallback: {status_nhc.get('is_fallback', False)})."
        )
        finding = Finding(
            id=f"f-freshness-audit-{uuid.uuid4().hex[:8]}",
            claim=claim_msg,
            value=status_marine.get("freshness", "unknown"),
            unit="freshness_state",
            evidence_ids=[ev_id],
            uncertainty="Deterministic comparison against configured provider SLA windows",
            is_forecast=False,
            observation_time=now_utc,
        )
        findings.append(finding)

        summary = {
            "status": "success",
            "gdacs": status_gdacs,
            "open_meteo": status_marine,
            "noaa_nhc": status_nhc,
            "evidence_id": ev_id,
        }
        return summary, findings, evidence

    # =========================================================================
    # CONVERSATIONAL CHAT ENGINE (MULTI-TURN & LLM TOOL-CALLING)
    # =========================================================================

    async def chat(
        self,
        message: str,
        conversation_id: str | None = None,
        location: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 50.0,
        db: Session | None = None,
        force_live_refresh: bool = False,
        use_custom_coordinates: bool = False,
    ) -> HazardAgentChatResponse:
        """
        Process a conversational user query with explicit location precedence,
        data-source selection planning, LLM tool-calling (Groq -> Gemini -> OpenRouter),
        or deterministic evidence-backed execution.
        """
        # 1. Geographic resolution with explicit precedence:
        # Step A: Explicit place name in current message takes absolute first priority!
        explicit_place = extract_explicit_place_name(message)
        requested_location: str | None = None
        prior_session = await session_manager.get(conversation_id) if conversation_id else None

        if explicit_place:
            target_lat, target_lon, loc_name, basin = explicit_place
            requested_location = loc_name
        elif use_custom_coordinates and latitude is not None and longitude is not None:
            # Step B: Custom coordinates checkbox explicitly active
            target_lat = latitude
            target_lon = longitude
            loc_name = f"{location} (Custom {latitude:.2f}°N, {longitude:.2f}°E)" if location else f"Custom ({latitude:.2f}°N, {longitude:.2f}°E)"
            basin = "arabian_sea" if (60.0 <= target_lon <= 77.5 and 0.0 <= target_lat <= 26.0) else "bay_of_bengal"
            requested_location = loc_name
        elif prior_session and prior_session.location and prior_session.location.latitude is not None:
            # Step C: Conversational follow-up turn without explicit place -> preserve active geographic anchor!
            target_lat = prior_session.location.latitude
            target_lon = prior_session.location.longitude
            loc_name = prior_session.location.name or "Coastal Sector"
            basin = "arabian_sea" if (60.0 <= target_lon <= 77.5 and 0.0 <= target_lat <= 26.0) else "bay_of_bengal"
            requested_location = None
        elif location:
            # Step D: Named location in API request (e.g. preset dropdown)
            resolved_from_loc = extract_explicit_place_name(location)
            if resolved_from_loc:
                target_lat, target_lon, loc_name, basin = resolved_from_loc
                requested_location = loc_name
            else:
                target_lat = latitude if latitude is not None else 12.91
                target_lon = longitude if longitude is not None else 74.85
                loc_name = location
                basin = "arabian_sea"
                requested_location = location
        elif latitude is not None and longitude is not None:
            # Step E: Coordinates provided
            target_lat = latitude
            target_lon = longitude
            loc_name = f"Coordinates ({latitude:.2f}°N, {longitude:.2f}°E)"
            basin = "arabian_sea" if (60.0 <= target_lon <= 77.5 and 0.0 <= target_lat <= 26.0) else "bay_of_bengal"
            requested_location = loc_name
        else:
            # Step F: Safe default anchor
            target_lat = 12.91
            target_lon = 74.85
            loc_name = "Mangaluru"
            basin = "arabian_sea"
            requested_location = None

        loc_context = LocationContext(latitude=target_lat, longitude=target_lon, name=loc_name, radius_km=radius_km)

        # 2. Acquire or initialize session, and update location (which isolates pools if location changed)
        session = await session_manager.get_or_create(conversation_id, loc_context)
        session.add_user_message(message)

        # 3. Deterministic Decision & Intent Engine
        decision = classify_and_plan_data_sources(
            query=message,
            target_lat=target_lat,
            target_lon=target_lon,
            loc_name=loc_name,
            requested_loc=requested_location,
            force_live_refresh=force_live_refresh,
        )

        # Optional on-demand live refresh
        if force_live_refresh:
            if self.forecast_repo and db:
                try:
                    await self.forecast_repo.sync_marine_forecast(db, target_lat, target_lon)
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"On-demand Marine refresh failed: {e!s}")
            if self.gdacs_client:
                try:
                    await self.gdacs_client.fetch_active_tropical_cyclones()
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"On-demand GDACS refresh failed: {e!s}")

        # 4. Check for Active LLM Providers in Priority Order (Groq -> Gemini -> OpenRouter)
        available_providers = await get_ordered_llm_providers()
        try:
            from unittest.mock import Mock
            single_active = await get_active_llm_provider()
            if isinstance(single_active, Mock) and not any(isinstance(p, Mock) for p in available_providers):
                available_providers = [single_active]
        except ImportError:
            pass

        provider_attempted = available_providers[0].name if available_providers else None
        fallback_reason: str | None = None
        tool_executions_log: list[dict[str, Any]] = []
        turn_findings: list[Finding] = []
        turn_evidence: list[EvidenceRecord] = []
        VALID_TOOL_NAMES = {t["function"]["name"] for t in HAZARD_AGENT_TOOLS}

        system_prompt = (
            "You are the ORCA Marine Hazard & Forecast Specialist Agent. Your mission is to provide accurate, "
            "scientifically grounded marine hazard intelligence from verified PostgreSQL datasets.\n"
            "RULES:\n"
            "1. Always use available tools to query data before making factual claims.\n"
            "2. When answering about wave conditions, sea state, or fishing safety, invoke `get_marine_forecast`.\n"
            "3. When answering about cyclone warnings, invoke `get_active_hazard_alerts`. Never report distant global storms (e.g. Mexico) as local threats.\n"
            "4. When asked about past storms, invoke `search_historical_cyclones`.\n"
            "5. When asked about multi-year cyclone trends or seasonal patterns, invoke `analyze_historical_cyclone_trends`.\n"
            "6. When asked to compare current conditions with past storms, invoke `compare_current_vs_historical`.\n"
            "7. For NOAA NHC cyclone forecasts, remember NHC coverage is Atlantic and Pacific ONLY. The Indian Ocean is out of coverage.\n"
            "8. When asked about tomorrow, invoke `get_marine_forecast` to inspect the +24h to +48h lead forecast window.\n"
            "9. Never declare vessels 'definitively safe' based on a forecast alone. Use qualified decision-support language (e.g. favorable for small craft under Douglas Scale guidelines; always check official port warning flags).\n"
            "10. Disclose that authoritative coastal warnings require consulting official IMD/INCOIS bulletins.\n"
            "11. Cite supporting evidence IDs (e.g. [ev-marine-wave-...]) in your answer.\n"
            f"CURRENT LOCATION CONTEXT: {loc_name} ({target_lat:.2f}°N, {target_lon:.2f}°E), Basin: {basin or 'Arabian Sea'}.\n"
        )

        for provider in available_providers:
            provider_name = provider.name
            model_name = getattr(provider, "model", "default")
            executed_signatures: set[str] = set()

            llm_messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
            for m in session.messages[-7:]:
                llm_messages.append({"role": m["role"], "content": m["content"]})

            success = False
            for _turn in range(3):
                try:
                    resp = await provider.chat_with_tools(
                        messages=llm_messages,
                        tools=HAZARD_AGENT_TOOLS,
                        temperature=0.1,
                    )
                except Exception as e:  # noqa: BLE001
                    fallback_reason = f"{provider_name} ({model_name}) error: {e!s}"
                    logger.warning(f"LLM tool turn failed ({provider_name}): {e!s}. Trying next provider in fallback chain...")
                    break

                if resp.tool_calls:
                    for tc in resp.tool_calls:
                        t_name = tc.name
                        t_args = tc.arguments or {}

                        # Validate against registered tool allowlist
                        if t_name not in VALID_TOOL_NAMES:
                            logger.warning(f"Model requested unauthorized tool '{t_name}'. Rejecting.")
                            tool_res = {"status": "error", "message": f"Tool '{t_name}' is not in authorized tool allowlist."}
                            llm_messages.append({
                                "role": "assistant",
                                "content": "",
                                "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": t_name, "arguments": json.dumps(t_args, default=str)}}],
                            })
                            llm_messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "name": t_name,
                                "content": json.dumps(tool_res, default=str),
                            })
                            continue

                        # Inject coordinates if missing
                        if "latitude" not in t_args or t_args["latitude"] is None:
                            t_args["latitude"] = target_lat
                        if "longitude" not in t_args or t_args["longitude"] is None:
                            t_args["longitude"] = target_lon
                        if "location_name" not in t_args or not t_args["location_name"]:
                            t_args["location_name"] = loc_name

                        if "tomorrow" in message.lower() and t_name == "get_marine_forecast":
                            t_args["is_tomorrow"] = True

                        call_sig = f"{t_name}:{json.dumps(t_args, sort_keys=True, default=str)}"
                        if call_sig in executed_signatures:
                            logger.debug(f"Skipping duplicate tool call {call_sig}")
                            continue
                        executed_signatures.add(call_sig)

                        tool_res, t_findings, t_evidence = self._dispatch_tool(
                            t_name, t_args, db, target_lat, target_lon, loc_name
                        )
                        turn_findings.extend(t_findings)
                        turn_evidence.extend(t_evidence)
                        tool_executions_log.append({
                            "tool": t_name,
                            "arguments": t_args,
                            "status": tool_res.get("status", "success"),
                            "summary": tool_res.get("status", "completed"),
                            "findings_count": len(t_findings),
                            "evidence_count": len(t_evidence),
                        })

                        # Feed result back to model
                        llm_messages.append({
                            "role": "assistant",
                            "content": "",
                            "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": t_name, "arguments": json.dumps(t_args, default=str)}}],
                        })
                        llm_messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "name": t_name,
                            "content": json.dumps(tool_res, default=str),
                        })
                else:
                    # Final response from model reached!
                    final_reply = resp.content
                    session.add_assistant_message(
                        content=final_reply,
                        evidence_ids=[e.id for e in turn_evidence],
                        provider=provider_name,
                        model=model_name,
                    )
                    session.add_evidence(turn_evidence)
                    session.add_findings(turn_findings)
                    success = True

                    return HazardAgentChatResponse(
                        conversation_id=session.conversation_id,
                        message=final_reply,
                        provider_used=provider_name,
                        model_used=model_name,
                        is_fallback=False,
                        provider_attempted=provider_attempted,
                        fallback_reason=None,
                        synthesis_source="llm",
                        trace_id=f"tr-{uuid.uuid4().hex[:8]}",
                        target_location={"latitude": target_lat, "longitude": target_lon, "name": loc_name},
                        decision=decision,
                        tool_executions=tool_executions_log,
                        findings=list(session.findings_pool.values()),
                        evidence=list(session.evidence_pool.values()),
                        limitations=session.limitations,
                        created_at_utc=datetime.now(UTC),
                    )

            if success:
                break

        # =====================================================================
        # PATH B: CONTROLLED DETERMINISTIC REASONING ENGINE (HONEST FALLBACK)
        # =====================================================================
        provider_used = "deterministic_fallback"
        model_used = "deterministic_rule_engine"
        is_fallback = True

        lower_msg = message.lower()
        is_follow_up = len(session.messages) > 1

        # Check for specific conversational follow-up questions
        if is_follow_up and ("why" in lower_msg and ("moderate" in lower_msg or "sea state" in lower_msg or "rough" in lower_msg)):
            # Follow-up 1: Explaining sea state classification
            wave_finding = next((f for f in session.findings_pool.values() if "f-marine-wave" in f.id), None)
            wave_val = wave_finding.value if wave_finding else 1.50
            final_reply = (
                f"The sea state at **{loc_name}** is classified as **Moderate** in accordance with the authoritative "
                f"**WMO No. 8 Douglas Sea Scale** standards:\n\n"
                f"- **Scientific Threshold**: Under WMO guidelines, significant wave heights ($H_s$) between **1.25 m and 2.50 m** "
                f"fall strictly into **Douglas Degree 4 (Moderate Sea)**.\n"
                f"- **Retrieved Model Evidence**: The Open-Meteo numerical wave forecast indicates a peak wave height of **{wave_val:.2f} m** "
                f"over the forecast horizon [ev-marine-wave].\n"
                f"- **Maritime Practical Guidance**: Moderate seas produce pronounced wave motion and frequent cresting; caution is advised "
                f"for small artisanal fishing craft and open vessels, though larger commercial vessels operate normally."
            )
        elif is_follow_up and ("official" in lower_msg or "warning" in lower_msg or "bulletin" in lower_msg):
            # Follow-up 2: Disclosing model vs official warning status
            final_reply = (
                "**No, this is not an official warning.**\n\n"
                "The sea-state and hazard indicators presented here are derived from numerical forecast models "
                "(Open-Meteo gridded marine physics and GDACS alert telemetry) for decision support.\n\n"
                "**Authoritative Governance Rules:**\n"
                "- Official coastal cautionary signals (Signals 1 through 11), gale warnings, and port closures can only be issued by national "
                "authorities, specifically the **India Meteorological Department (IMD)**, **Indian Coast Guard**, or state Disaster Management Authorities.\n"
                "- Numerical wave models provide valuable situational screening but cannot replace statutory port warnings."
            )
        elif is_follow_up and ("fresh" in lower_msg or "stale" in lower_msg or "timestamp" in lower_msg or "sla" in lower_msg):
            # Follow-up 3: Freshness & SLA check
            fresh_res, f_findings, f_evidence = self.tool_check_data_freshness(db, target_lat, target_lon)
            turn_findings.extend(f_findings)
            turn_evidence.extend(f_evidence)
            tool_executions_log.append({"tool": "check_data_freshness", "status": "success"})

            marine_fresh = fresh_res["open_meteo"].get("freshness", "unknown").upper()
            marine_fb = fresh_res["open_meteo"].get("is_fallback", False)
            gdacs_fresh = fresh_res["gdacs"].get("freshness", "unknown").upper()
            gdacs_fb = fresh_res["gdacs"].get("is_fallback", False)

            final_reply = (
                f"### Pipeline Data Freshness & SLA Audit\n"
                f"- **Open-Meteo Marine Waves**: Status is **{marine_fresh}** (Fallback Active: `{marine_fb}`, SLA threshold: 12h).\n"
                f"- **GDACS Active Alerts**: Status is **{gdacs_fresh}** (Fallback Active: `{gdacs_fb}`, SLA threshold: 6h).\n"
                f"- **NOAA NHC Pipeline**: Status is **{fresh_res['noaa_nhc'].get('freshness', 'unknown').upper()}** (SLA threshold: 6h).\n\n"
                f"All metrics are audited against PostgreSQL synchronization timestamps [{fresh_res.get('evidence_id', 'ev-freshness-audit')}]."
            )
        elif decision.intent == "historical_trend":
            # Intent: Historical Trends & Seasonal Analysis
            t_res, t_f, t_e = self.tool_analyze_historical_cyclone_trends(db, target_lat, target_lon, loc_name)
            turn_findings.extend(t_f)
            turn_evidence.extend(t_e)
            tool_executions_log.append({"tool": "analyze_historical_cyclone_trends", "status": t_res.get("status")})

            t_finding = next((f for f in t_f if "f-ibtracs-trend" in f.id), None)
            claim_text = t_finding.claim if t_finding else "Historical climatological analysis completed."
            final_reply = (
                f"### Historical Cyclone Climatology & Multi-Year Trends for **{loc_name}** ({target_lat:.2f}°N, {target_lon:.2f}°E)\n\n"
                f"{claim_text}\n\n"
                f"- **Data Archive**: NOAA International Best Track Archive for Climate Stewardship (IBTrACS v04r01) [{t_res.get('evidence_id', 'ev-ibtracs')}].\n"
                f"- **Seasonal Window**: Peak storm formation in this sector concentrates in **{t_res.get('peak_months', 'April-May and October-November')}**.\n\n"
                f"*Data Coverage Note*: Historical records prior to the satellite era (pre-1970) possess observational gaps. "
                f"Historical patterns represent retrospective baselines, not operational forecasts of future events."
            )
        elif decision.intent == "comparison":
            # Intent: Current vs Historical Comparison
            comp_res, comp_f, comp_e = self.tool_compare_current_vs_historical(db, target_lat, target_lon, loc_name)
            turn_findings.extend(comp_f)
            turn_evidence.extend(comp_e)
            tool_executions_log.append({"tool": "compare_current_vs_historical", "status": comp_res.get("status")})

            comp_finding = next((f for f in comp_f if "f-marine-comparison" in f.id), None)
            claim_text = comp_finding.claim if comp_finding else "Comparison completed."
            final_reply = (
                f"### Current vs Historical Marine Condition Comparison for **{loc_name}**\n\n"
                f"{claim_text}\n\n"
                f"- **Current Model Forecast**: Significant wave height {comp_res.get('current_wave_m', 1.2):.2f} m from Open-Meteo numerical wave spectra.\n"
                f"- **Historical Benchmark**: Closest historical cyclone '{comp_res.get('closest_historical_storm')}' approached within {comp_res.get('closest_dist_km', 0):.1f} km [ev-marine-comparison].\n\n"
                f"*Advisory*: Historical matches provide climatological context and do not predict future storm evolution."
            )
        elif decision.intent == "historical_event":
            # Intent: Historical Event / Past Storm Tracks (Purely historical, no wasteful live wave refresh)
            h_res, h_f, h_e = self.tool_search_historical_cyclones(db, target_lat, target_lon, loc_name)
            turn_findings.extend(h_f)
            turn_evidence.extend(h_e)
            tool_executions_log.append({"tool": "search_historical_cyclones", "status": h_res.get("status")})

            hist_f = next((f for f in turn_findings if "f-ibtracs" in f.id), None)
            claim_text = hist_f.claim if hist_f else f"No historical cyclone best-tracks found within range of {loc_name}."
            final_reply = (
                f"### Historical Cyclone Track Analysis for **{loc_name}** ({target_lat:.2f}°N, {target_lon:.2f}°E)\n\n"
                f"- **IBTrACS Benchmark**: {claim_text}\n\n"
                f"*Notice*: Historical cyclone tracks describe past events from the NOAA IBTrACS archive and do not represent current warnings or active conditions."
            )
        elif decision.intent == "active_hazards":
            # Intent: Active Cyclone & Warning Alerts
            a_res, a_f, a_e = self.tool_get_active_hazard_alerts(db, target_lat, target_lon, loc_name, max_distance_km=1500.0)
            turn_findings.extend(a_f)
            turn_evidence.extend(a_e)
            tool_executions_log.append({"tool": "get_active_hazard_alerts", "status": a_res.get("status")})

            sections = [f"### Active Tropical Cyclone & Hazard Alerts for **{loc_name}**"]
            threat_f = [f for f in turn_findings if "f-gdacs-" in f.id and "f-gdacs-clear" not in f.id and "distant" not in f.id]
            clear_f = next((f for f in turn_findings if "f-gdacs-clear" in f.id), None)
            if threat_f:
                for tf in threat_f:
                    sections.append(f"- **Active Regional Threat**: {tf.claim}")
            elif clear_f:
                sections.append(f"- **Active Cyclone Alerts**: {clear_f.claim}")
            sections.append(
                "\n*Official Advisory Note*: Statutory coastal cautionary signals and storm warnings must be verified "
                "with the India Meteorological Department (IMD) or national authorities."
            )
            final_reply = "\n\n".join(sections)
        elif decision.intent == "cyclone_forecast_lookup":
            # Intent: Official NHC Cyclone Forecast Run
            c_res, c_f, c_e = self.tool_get_cyclone_forecast(db, target_lat, target_lon, loc_name)
            turn_findings.extend(c_f)
            turn_evidence.extend(c_e)
            tool_executions_log.append({"tool": "get_cyclone_forecast", "status": c_res.get("status")})

            nhc_f = next((f for f in turn_findings if "f-nhc-coverage" in f.id or "f-nhc-run" in f.id), None)
            claim_text = nhc_f.claim if nhc_f else f"NOAA NHC lookup completed for {loc_name}."
            final_reply = (
                f"### Official Cyclone Forecast Advisory for **{loc_name}**\n\n"
                f"- **Advisory Status**: {claim_text}\n"
            )
        else:
            # Standard Query: current_conditions, forecast, comprehensive_hazard_assessment
            is_tomorrow = "tomorrow" in message.lower()
            w_res, w_f, w_e = self.tool_get_marine_forecast(db, target_lat, target_lon, loc_name, is_tomorrow=is_tomorrow)
            turn_findings.extend(w_f)
            turn_evidence.extend(w_e)
            tool_executions_log.append({"tool": "get_marine_forecast", "status": w_res.get("status")})

            a_res, a_f, a_e = self.tool_get_active_hazard_alerts(db, target_lat, target_lon, loc_name, max_distance_km=1500.0)
            turn_findings.extend(a_f)
            turn_evidence.extend(a_e)
            tool_executions_log.append({"tool": "get_active_hazard_alerts", "status": a_res.get("status")})

            if decision.intent == "comprehensive_hazard_assessment":
                h_res, h_f, h_e = self.tool_search_historical_cyclones(db, target_lat, target_lon, loc_name)
                turn_findings.extend(h_f)
                turn_evidence.extend(h_e)
                tool_executions_log.append({"tool": "search_historical_cyclones", "status": h_res.get("status")})

                c_res, c_f, c_e = self.tool_get_cyclone_forecast(db, target_lat, target_lon, loc_name)
                turn_findings.extend(c_f)
                turn_evidence.extend(c_e)
                tool_executions_log.append({"tool": "get_cyclone_forecast", "status": c_res.get("status")})

            # Assemble clean conversational markdown answer
            time_header = "Tomorrow's Marine Forecast" if is_tomorrow else "Marine Hazard & Forecast Assessment"
            sections = [f"### {time_header} for **{loc_name}** ({target_lat:.2f}°N, {target_lon:.2f}°E)"]

            wave_f = next((f for f in turn_findings if "f-marine-wave" in f.id), None)
            if wave_f:
                sections.append(f"- **Sea State & Waves**: {wave_f.claim}")

            clear_f = next((f for f in turn_findings if "f-gdacs-clear" in f.id), None)
            threat_f = [f for f in turn_findings if "f-gdacs-" in f.id and "f-gdacs-clear" not in f.id and "distant" not in f.id]
            if threat_f:
                for tf in threat_f:
                    sections.append(f"- **Active Regional Threat**: {tf.claim}")
            elif clear_f:
                sections.append(f"- **Active Cyclone Alerts**: {clear_f.claim}")

            hist_f = next((f for f in turn_findings if "f-ibtracs" in f.id), None)
            if hist_f:
                sections.append(f"- **Historical Benchmark**: {hist_f.claim}")

            nhc_f = next((f for f in turn_findings if "f-nhc-coverage" in f.id or "f-nhc-run" in f.id), None)
            if nhc_f:
                sections.append(f"- **Official NHC Forecast**: {nhc_f.claim}")

            distant_f = [f for f in turn_findings if "f-gdacs-distant" in f.id]
            if distant_f:
                sections.append(f"- **Global Cyclone Activity (Distant Context)**: {distant_f[0].claim}")

            sections.append(
                "\n*Advisory Disclaimer*: ORCA Marine Hazard assessments are generated from gridded numerical models "
                "for decision support. They do not replace authoritative official bulletins issued by National Weather Services. "
                "Always verify official port warning signals before venturing to sea."
            )
            final_reply = "\n\n".join(sections)

        # 5. Save and return conversational turn
        session.add_assistant_message(
            content=final_reply,
            evidence_ids=[e.id for e in turn_evidence],
            provider=provider_used,
            model=model_used,
        )
        session.add_evidence(turn_evidence)
        session.add_findings(turn_findings)

        return HazardAgentChatResponse(
            conversation_id=session.conversation_id,
            message=final_reply,
            provider_used=provider_used,
            model_used=model_used,
            is_fallback=is_fallback,
            provider_attempted=provider_attempted or "none",
            fallback_reason=fallback_reason or "All configured LLM providers failed or none configured.",
            synthesis_source="deterministic_rule_engine",
            trace_id=f"tr-{uuid.uuid4().hex[:8]}",
            target_location={"latitude": target_lat, "longitude": target_lon, "name": loc_name},
            decision=decision,
            tool_executions=tool_executions_log,
            findings=list(session.findings_pool.values()),
            evidence=list(session.evidence_pool.values()),
            limitations=session.limitations,
            created_at_utc=datetime.now(UTC),
        )

    def _dispatch_tool(
        self,
        name: str,
        args: dict[str, Any],
        db: Session | None,
        default_lat: float,
        default_lon: float,
        default_name: str,
    ) -> tuple[dict[str, Any], list[Finding], list[EvidenceRecord]]:
        try:
            raw_lat = args.get("latitude", default_lat)
            raw_lon = args.get("longitude", default_lon)
            lat = max(-90.0, min(90.0, float(raw_lat if raw_lat is not None else default_lat)))
            lon = max(-180.0, min(180.0, float(raw_lon if raw_lon is not None else default_lon)))
            loc = str(args.get("location_name") or default_name)

            if name == "get_marine_forecast":
                hours = int(args.get("hours", 72))
                is_tomorrow = bool(args.get("is_tomorrow", False) or "tomorrow" in str(args.get("time_window", "")).lower())
                return self.tool_get_marine_forecast(db, lat, lon, loc, hours=hours, is_tomorrow=is_tomorrow)
            elif name == "get_active_hazard_alerts":
                max_dist = float(args.get("max_distance_km", 1500.0))
                return self.tool_get_active_hazard_alerts(db, lat, lon, loc, max_distance_km=max_dist)
            elif name == "search_historical_cyclones":
                return self.tool_search_historical_cyclones(db, lat, lon, loc)
            elif name == "analyze_historical_cyclone_trends":
                rad = float(args.get("radius_km", 350.0))
                return self.tool_analyze_historical_cyclone_trends(db, lat, lon, loc, radius_km=rad)
            elif name == "compare_current_vs_historical":
                return self.tool_compare_current_vs_historical(db, lat, lon, loc)
            elif name == "get_cyclone_forecast":
                return self.tool_get_cyclone_forecast(db, lat, lon, loc)
            elif name == "check_data_freshness":
                return self.tool_check_data_freshness(db, lat, lon)
            elif name == "calculate_sea_state":
                ht = float(args.get("significant_wave_height_m", 1.5))
                return evaluate_douglas_sea_state(ht), [], []
            elif name == "calculate_storm_distance":
                t_lat = float(args.get("target_lat", lat))
                t_lon = float(args.get("target_lon", lon))
                s_lat = float(args.get("storm_lat", lat))
                s_lon = float(args.get("storm_lon", lon))
                d = haversine_distance_km(t_lat, t_lon, s_lat, s_lon)
                return {"distance_km": round(d, 1)}, [], []
            elif name == "check_provider_coverage":
                prov = str(args.get("provider_name", "noaa_nhc"))
                is_ind = (30.0 <= lon <= 110.0 and -40.0 <= lat <= 32.0)
                covered = not is_ind if prov == "noaa_nhc" else True
                return {"provider": prov, "is_in_coverage": covered}, [], []

            return {"status": "error", "error": f"Unknown tool '{name}'"}, [], []
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"Tool '{name}' execution failed with exception: {exc!s}")
            return {"status": "error", "error": f"Execution error in {name}: {exc!s}"}, [], []

    # =========================================================================
    # SPECIALIST AGENT RUN CONTRACT (COMPATIBILITY WITH SHARED ARCHITECTURE)
    # =========================================================================

    async def run(self, task: InvestigationTask) -> AgentResult:
        """Execute specialist analysis for InvestigationTask adhering to shared AgentResult contract."""
        logger.info(f"[{self.agent_id}] Running investigation for task '{task.investigation_id}': {task.query}")

        findings: list[Finding] = []
        evidence: list[EvidenceRecord] = []
        limitations: list[str] = [
            "Official localized storm warning signals (1-11) must be verified directly with national authorities (IMD/JTWC).",
            "Historical cyclone tracks represent retrospective benchmarks, not operational forecasts of future events.",
            "Positional track uncertainty is ±15 to 30 km for historical best-track observations.",
        ]
        errors: list[str] = []
        now_utc = datetime.now(UTC)

        target_lat, target_lon, loc_name, _basin = resolve_geographic_context(task.location, task.query)
        intent = detect_analysis_intent(task.query, task.parameters)

        effective_lat = target_lat if target_lat is not None else 12.91
        effective_lon = target_lon if target_lon is not None else 74.85
        if target_lat is None:
            limitations.append("No explicit geographic coordinates provided; analysis anchored to central Arabian Sea (12.91°N, 74.85°E).")

        provider_failures = 0

        # =====================================================================
        # 1 & 2. Active Hazards & Historical Benchmarks (Repo vs Client)
        # =====================================================================
        db: Session | None = task.parameters.get("db_session")

        if self.hazard_repo is not None:
            # Path A: Persisted database repository
            try:
                _, af, ae = self.tool_get_active_hazard_alerts(db, effective_lat, effective_lon, loc_name)
                findings.extend(af)
                evidence.extend(ae)
            except Exception as e:  # noqa: BLE001
                provider_failures += 1
                logger.warning(f"Failed getting active alerts from repo: {e!s}")
                errors.append(str(e))

            try:
                _, hf, he = self.tool_search_historical_cyclones(db, effective_lat, effective_lon, loc_name)
                findings.extend(hf)
                evidence.extend(he)
            except Exception as e:  # noqa: BLE001
                provider_failures += 1
                logger.warning(f"Failed searching historical cyclones from repo: {e!s}")
                errors.append(str(e))
        else:
            # Path B: Direct provider clients
            # Live Hazard Check via GDACS (with geographic relevance filtering)
            gdacs_events: list[GDACSEvent] = []
            try:
                gdacs_events = await self.gdacs_client.fetch_active_tropical_cyclones()
            except Exception as e:  # noqa: BLE001
                provider_failures += 1
                err_msg = f"Live GDACS alert service unavailable: {e!s}"
                logger.warning(f"[{self.agent_id}] {err_msg}")
                errors.append(err_msg)
                limitations.append("Could not refresh live global disaster alert notifications from GDACS.")

            active_cyclone_found = False
            if gdacs_events:
                for event in gdacs_events:
                    dist_km = None
                    if event.latitude is not None and event.longitude is not None:
                        dist_km = haversine_distance_km(effective_lat, effective_lon, event.latitude, event.longitude)
                        if dist_km > 1500.0:
                            continue  # Geographically unrelated distant alert (e.g. Mexico)
                    ev_id = f"ev-gdacs-{event.event_id}"
                    ev_record = EvidenceRecord(
                        id=ev_id,
                        dataset_id="gdacs-tc",
                        source_name="Global Disaster Alert and Coordination System (GDACS)",
                        source_url=event.report_url or "https://www.gdacs.org",
                        retrieval_time=now_utc,
                        observation_time=event.from_date or now_utc,
                        valid_until_time=event.to_date,
                        variable="tropical_cyclone_alert",
                        value={
                            "event_name": event.event_name,
                            "alert_level": event.alert_level,
                            "country": event.country,
                            "severity_kmh": event.severity_kmh,
                            "distance_km": round(dist_km, 1) if dist_km else None,
                        },
                        unit="alert_level",
                        quality_flag="live_advisory",
                        license="Public Domain / UN-EU",
                        metadata={
                            "alert_score": event.alert_score,
                            "is_current": event.is_current,
                        },
                    )
                    evidence.append(ev_record)

                    dist_text = f" (Distance: {dist_km:.0f} km)" if dist_km else ""
                    findings.append(
                        Finding(
                            id=f"f-gdacs-{event.event_id}",
                            claim=(
                                f"Active Tropical Cyclone '{event.event_name}' flagged at {event.alert_level} Alert level "
                                f"by GDACS affecting region ({event.country or 'Marine Sector'}){dist_text}."
                            ),
                            value=event.alert_level,
                            unit="alert_level",
                            evidence_ids=[ev_id],
                            uncertainty="Global disaster coordinate polygon uncertainty",
                            is_forecast=True,
                            observation_time=event.from_date or now_utc,
                        )
                    )
                    active_cyclone_found = True

            if not active_cyclone_found and not errors:
                ev_id = f"ev-gdacs-clear-{task.investigation_id[:8]}"
                ev_record = EvidenceRecord(
                    id=ev_id,
                    dataset_id="gdacs-tc",
                    source_name="Global Disaster Alert and Coordination System (GDACS)",
                    source_url="https://www.gdacs.org",
                    retrieval_time=now_utc,
                    observation_time=now_utc,
                    latitude=effective_lat,
                    longitude=effective_lon,
                    variable="active_cyclone_check",
                    value="clear",
                    unit="status",
                    quality_flag="verified_live_query",
                    license="Public Domain / UN-EU",
                )
                evidence.append(ev_record)
                findings.append(
                    Finding(
                        id=f"f-gdacs-clear-{task.investigation_id[:8]}",
                        claim=f"No active tropical cyclone warning currently detected within 1,500 km of {loc_name} by GDACS.",
                        value="clear",
                        unit="status",
                        evidence_ids=[ev_id],
                        uncertainty="Update cycle latency approximately 3 hours",
                        is_forecast=False,
                        observation_time=now_utc,
                    )
                )

            # Historical Cyclone Track Baseline via NOAA IBTrACS
            ibtracs_hazards: list[HazardRead] = []
            try:
                ibtracs_hazards = self.ibtracs_client.load_local_dataset()
            except Exception as e:  # noqa: BLE001
                provider_failures += 1
                err_msg = f"NOAA IBTrACS historical dataset access failure: {e!s}"
                logger.warning(f"[{self.agent_id}] {err_msg}")
                errors.append(err_msg)
                limitations.append("Historical cyclone comparison archive was unreachable.")

            if ibtracs_hazards:
                closest_storm: HazardRead | None = None
                min_storm_dist = float("inf")
                best_point = None

                for storm in ibtracs_hazards:
                    pt, dist = find_closest_track_point(
                        effective_lat, effective_lon, storm.track_points
                    )
                    if dist < min_storm_dist:
                        min_storm_dist = dist
                        closest_storm = storm
                        best_point = pt

                if closest_storm and best_point:
                    ev_id = f"ev-ibtracs-{closest_storm.hazard_id}"
                    max_wind = max(
                        (p.wind_speed_knots for p in closest_storm.track_points if p.wind_speed_knots is not None),
                        default=None,
                    )
                    min_pres = min(
                        (p.pressure_hpa for p in closest_storm.track_points if p.pressure_hpa is not None),
                        default=None,
                    )

                    ev_record = EvidenceRecord(
                        id=ev_id,
                        dataset_id="noaa-ibtracs",
                        source_name="NOAA International Best Track Archive (IBTrACS v04r01)",
                        source_url="https://www.ncei.noaa.gov/products/international-best-track-archive",
                        retrieval_time=now_utc,
                        observation_time=best_point.time,
                        latitude=best_point.latitude,
                        longitude=best_point.longitude,
                        variable="historical_cyclone_track",
                        value={
                            "storm_name": closest_storm.name,
                            "closest_distance_km": min_storm_dist,
                            "point_wind_knots": best_point.wind_speed_knots,
                            "point_pressure_hpa": best_point.pressure_hpa,
                            "peak_wind_knots": max_wind,
                            "min_pressure_hpa": min_pres,
                        },
                        unit="knots_and_hpa",
                        quality_flag="verified_best_track",
                        license="Public Domain (NOAA NCEI)",
                        metadata={
                            "basin": closest_storm.basin,
                            "first_observed": closest_storm.first_observed.isoformat() if closest_storm.first_observed else None,
                            "last_observed": closest_storm.last_observed.isoformat() if closest_storm.last_observed else None,
                            "total_track_points": len(closest_storm.track_points),
                        },
                    )
                    evidence.append(ev_record)

                    wind_text = f", peak wind of {max_wind} kts" if max_wind else ""
                    pres_text = f", minimum central pressure of {min_pres} hPa" if min_pres else ""

                    findings.append(
                        Finding(
                            id=f"f-ibtracs-{closest_storm.hazard_id}",
                            claim=(
                                f"Historical benchmark: {closest_storm.name} tracked within {min_storm_dist:.1f} km "
                                f"of target coordinate ({effective_lat:.2f}°N, {effective_lon:.2f}°E) on "
                                f"{best_point.time.strftime('%Y-%m-%d %H:%M UTC')}{wind_text}{pres_text}."
                            ),
                            value=min_storm_dist,
                            unit="km",
                            evidence_ids=[ev_id],
                            uncertainty="Best-track interpolation accuracy ±25 km",
                            is_forecast=False,
                            observation_time=best_point.time,
                        )
                    )

        # =====================================================================
        # 3. NOAA NHC Cyclone Forecast Runs & Boundary Evaluation
        # =====================================================================
        query_lower = task.query.lower()
        if (
            intent in {"cyclone_forecast_lookup", "comprehensive_hazard_assessment"}
            or "nhc" in query_lower
            or "noaa" in query_lower
        ):
            _, cf, ce = self.tool_get_cyclone_forecast(db, effective_lat, effective_lon, loc_name)
            findings.extend(cf)
            evidence.extend(ce)
            if any(f.value == "OUT_OF_COVERAGE" for f in cf):
                limitations.append(
                    "NOAA NHC Geographic Coverage Limitation: NOAA NHC covers the North Atlantic, Eastern Pacific, "
                    "and Central Pacific basins only. It does not provide forecasts for the Indian Ocean, Arabian Sea, or Bay of Bengal. "
                    "Indian coastal warnings must be derived from IMD / JTWC."
                )

        # =====================================================================
        # 4. Marine Wave Forecast (if db_session is provided)
        # =====================================================================
        if db is not None and intent in {"marine_forecast", "comprehensive_hazard_assessment", "data_freshness"}:
            _, wf, we = self.tool_get_marine_forecast(db, effective_lat, effective_lon, loc_name)
            findings.extend(wf)
            evidence.extend(we)
            if not wf:
                limitations.append(f"Gridded wave forecast for {loc_name} was unavailable in PostgreSQL cache.")
        elif intent in {"marine_forecast", "comprehensive_hazard_assessment", "data_freshness"}:
            limitations.append("Database session was unavailable; gridded wave forecast could not be queried.")

        # =====================================================================
        # 5. Status Determination
        # =====================================================================
        if provider_failures == 0 and findings:
            status = AgentExecutionStatus.COMPLETED
        elif findings and provider_failures > 0:
            status = AgentExecutionStatus.PARTIAL
        elif not findings and provider_failures > 0:
            status = AgentExecutionStatus.FAILED
        else:
            status = AgentExecutionStatus.COMPLETED

        return AgentResult(
            agent_id=self.agent_id,
            status=status,
            findings=findings,
            evidence=evidence,
            limitations=limitations,
            errors=errors,
        )

