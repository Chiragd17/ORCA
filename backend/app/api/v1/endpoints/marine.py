import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query
import httpx
from app.schemas import MarineObservationsResponse

router = APIRouter()


@router.get("/observations", response_model=MarineObservationsResponse, tags=["Marine"])
async def get_marine_observations(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    start_time: Optional[datetime] = Query(None, description="Start time UTC"),
    end_time: Optional[datetime] = Query(None, description="End time UTC"),
    variables: Optional[str] = Query(None, description="Comma-separated variables, e.g. sst,wave_height"),
):
    """Retrieve marine observations for a specific coordinate and time window."""
    return MarineObservationsResponse(
        location={"latitude": lat, "longitude": lon},
        temporal_coverage={"start": start_time, "end": end_time},
        observations=[],
    )


# Indicative criteria based on CMFRI & DG Shipping coastal safety guidelines
VESSEL_CRITERIA = {
    "traditional": {
        "name": "Traditional Canoe / Country Craft (Naavu)",
        "safe_wave_m": 1.0,
        "caution_wave_m": 1.5,
        "safe_gust_kmh": 20.0,
        "caution_gust_kmh": 28.0,
        "description": "Small unmotorized or oar-powered craft; highly vulnerable to surf break and shoaling bars.",
    },
    "motorized_small": {
        "name": "Motorized Inshore Fiber Boat (OAL < 10m)",
        "safe_wave_m": 1.8,
        "caution_wave_m": 2.3,
        "safe_gust_kmh": 30.0,
        "caution_gust_kmh": 42.0,
        "description": "Outboard motorized boat for inshore fishing up to 12 nautical miles.",
    },
    "mechanized_trawler": {
        "name": "Mechanized Deep-Sea Trawler / Purse Seiner",
        "safe_wave_m": 2.5,
        "caution_wave_m": 3.8,
        "safe_gust_kmh": 38.0,
        "caution_gust_kmh": 60.0,
        "description": "Inboard diesel trawler equipped for multi-day voyages beyond 12 nautical miles.",
    },
}


@router.get("/forecast", tags=["Marine"])
async def get_marine_forecast(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    hours: int = Query(24, ge=6, le=72, description="Forecast hours (12, 24, 48, etc.)"),
    vessel_type: str = Query("motorized_small", description="traditional, motorized_small, mechanized_trawler"),
):
    """
    Fetch real hourly forward marine & wind forecast for decision support.
    Safeguards:
    1. Dynamic window calculations based solely on retrieved numerical model data.
    2. Contextualized vessel thresholds with explicit disclaimers.
    3. Conservative fallback if external feeds are unavailable.
    """
    selected_vessel = VESSEL_CRITERIA.get(vessel_type, VESSEL_CRITERIA["motorized_small"])

    try:
        async with httpx.AsyncClient(timeout=4.5) as client:
            marine_task = client.get(
                "https://marine-api.open-meteo.com/v1/marine",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,wind_wave_height",
                    "forecast_hours": hours,
                    "timezone": "auto",
                },
            )
            weather_task = client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation",
                    "forecast_hours": hours,
                    "timezone": "auto",
                },
            )
            marine_res, weather_res = await asyncio.gather(marine_task, weather_task, return_exceptions=True)

        if isinstance(marine_res, Exception) or isinstance(weather_res, Exception):
            raise ConnectionError("Forecast upstream provider connection timed out.")

        if marine_res.status_code != 200 or weather_res.status_code != 200:
            raise ConnectionError("Upstream forecast service returned non-200 code.")

        m_hourly = marine_res.json().get("hourly", {})
        w_hourly = weather_res.json().get("hourly", {})

        times = m_hourly.get("time", [])
        wave_heights = m_hourly.get("wave_height", [])
        wave_periods = m_hourly.get("wave_period", [])
        swell_heights = m_hourly.get("swell_wave_height", [])
        wind_speeds = w_hourly.get("wind_speed_10m", [])
        wind_gusts = w_hourly.get("wind_gusts_10m", [])
        wind_dirs = w_hourly.get("wind_direction_10m", [])

        if not times or not wave_heights:
            raise ValueError("Empty hourly forecast data returned.")

        hourly_series: List[Dict[str, Any]] = []
        peak_wave = 0.0
        peak_wave_time = ""
        peak_gust = 0.0
        peak_gust_time = ""

        first_adverse_time: Optional[str] = None
        first_caution_time: Optional[str] = None
        continuous_safe_hours = 0
        still_safe = True

        for i in range(min(len(times), hours)):
            t = times[i]
            wh = wave_heights[i] if i < len(wave_heights) and wave_heights[i] is not None else 0.0
            wp = wave_periods[i] if i < len(wave_periods) and wave_periods[i] is not None else 0.0
            sh = swell_heights[i] if i < len(swell_heights) and swell_heights[i] is not None else 0.0
            ws = wind_speeds[i] if i < len(wind_speeds) and wind_speeds[i] is not None else 0.0
            wg = wind_gusts[i] if i < len(wind_gusts) and wind_gusts[i] is not None else 0.0
            wd = wind_dirs[i] if i < len(wind_dirs) and wind_dirs[i] is not None else 0.0

            if wh > peak_wave:
                peak_wave = wh
                peak_wave_time = t
            if wg > peak_gust:
                peak_gust = wg
                peak_gust_time = t

            # Determine risk tier for this specific hour
            if wh >= selected_vessel["caution_wave_m"] or wg >= selected_vessel["caution_gust_kmh"]:
                h_risk = "ADVERSE"
                if first_adverse_time is None:
                    first_adverse_time = t
                still_safe = False
            elif wh >= selected_vessel["safe_wave_m"] or wg >= selected_vessel["safe_gust_kmh"]:
                h_risk = "CAUTION"
                if first_caution_time is None:
                    first_caution_time = t
                still_safe = False
            else:
                h_risk = "FAVORABLE"
                if still_safe:
                    continuous_safe_hours += 1

            hourly_series.append({
                "time": t,
                "wave_height": wh,
                "wave_period": wp,
                "swell_height": sh,
                "wind_speed": ws,
                "wind_gusts": wg,
                "wind_direction": wd,
                "risk_tier": h_risk,
            })

        # Overall window assessment
        if peak_wave >= selected_vessel["caution_wave_m"] or peak_gust >= selected_vessel["caution_gust_kmh"]:
            overall_status = "ADVERSE_WINDOW"
        elif peak_wave >= selected_vessel["safe_wave_m"] or peak_gust >= selected_vessel["safe_gust_kmh"]:
            overall_status = "CAUTION_WINDOW"
        else:
            overall_status = "FAVORABLE_WINDOW"

        # Safe departure & return advisory
        if continuous_safe_hours >= 3:
            safe_window_text = f"{times[0]} to {times[min(continuous_safe_hours - 1, len(times) - 1)]} ({continuous_safe_hours} consecutive favorable hours)"
        elif continuous_safe_hours > 0:
            safe_window_text = f"Brief favorable window ({continuous_safe_hours} hr) from {times[0]}; early caution warranted"
        else:
            safe_window_text = "No favorable window detected. Sea or wind exceeds standard operational criteria from the start of forecast."

        deterioration_text = ""
        if first_adverse_time:
            deterioration_text = f"Conditions expected to become adverse starting around {first_adverse_time} (waves >= {selected_vessel['caution_wave_m']}m or gusts >= {selected_vessel['caution_gust_kmh']} km/h)."
        elif first_caution_time:
            deterioration_text = f"Conditions entering cautionary zone starting around {first_caution_time}."
        else:
            deterioration_text = "Conditions remain within favorable thresholds throughout the entire forecast horizon."

        ai_summary = (
            f"Forecast for {selected_vessel['name']} over the next {hours} hours indicates {overall_status.lower().replace('_', ' ')}. "
            f"Peak wave height of {peak_wave:.2f} m is forecast around {peak_wave_time}, with maximum wind gusts reaching {peak_gust:.1f} km/h around {peak_gust_time}. "
            f"{safe_window_text}. {deterioration_text} "
            f"Note: ECMWF 0.1° gridded models do not resolve shallow estuary bar shoaling or local tidal race. "
            f"Local Port Officer signals and IMD coastal bulletins take legal precedence."
        )

        return {
            "data_available": True,
            "provider": "Open-Meteo Marine / ECMWF IFS & NOAA GFS",
            "issue_time": datetime.now(timezone.utc).isoformat(),
            "location": {"latitude": lat, "longitude": lon},
            "hours": hours,
            "vessel": selected_vessel,
            "overall_status": overall_status,
            "peak_wave": {"value_m": peak_wave, "time": peak_wave_time},
            "peak_gust": {"value_kmh": peak_gust, "time": peak_gust_time},
            "favorable_hours_count": continuous_safe_hours,
            "safe_window_summary": safe_window_text,
            "deterioration_summary": deterioration_text,
            "ai_summary": ai_summary,
            "disclaimer": (
                "ADVISORY NOTICE: Criteria are indicative planning guidelines. Vessel seaworthiness, loading, "
                "crew experience, and localized breaking bars at river mouths alter actual risk. "
                "Official IMD/INCOIS sea warnings and Port Officer cautionary signals take legal precedence."
            ),
            "hourly": hourly_series,
        }

    except Exception as exc:
        # Safeguard 3: Handle stale or missing data conservatively
        return {
            "data_available": False,
            "status": "UNAVAILABLE",
            "error_detail": str(exc),
            "provider": "Open-Meteo Marine / ECMWF IFS",
            "issue_time": datetime.now(timezone.utc).isoformat(),
            "location": {"latitude": lat, "longitude": lon},
            "hours": hours,
            "vessel": selected_vessel,
            "overall_status": "ASSESSMENT_UNAVAILABLE",
            "ai_summary": (
                "Forecast numerical feed is currently unreachable. ORCA does not generate unverified safety assurances. "
                "Do NOT assume unmonitored waters are safe. Fishermen must inspect visual port warning signals and check official IMD/INCOIS bulletins prior to sailing."
            ),
            "disclaimer": (
                "CRITICAL WARNING: Forecast data feed offline. Unmonitored sea conditions must be treated as hazardous. "
                "Consult the local Fisheries Department or Harbour Master before any voyage."
            ),
            "hourly": [],
        }
