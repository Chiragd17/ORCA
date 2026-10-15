"""
Verified Historical Coastal Hazard Observations & Precedents for Western India (Karnataka).

Sources:
- India Meteorological Department (IMD) RSMC Tropical Cyclones Reports
- Indian National Centre for Ocean Information Services (INCOIS) Wave Rider Buoys
- National Disaster Management Authority (NDMA) & KSDMA Coastal Assessment Reports

Distinguishes:
- Observed historical hazards vs. modeled forecast estimates.
- Preserves temporal windows, scientific agencies, buoys, units, and limitations.
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.agents.base import Finding
from app.agents.coastal_risk.spatial import haversine_distance_km, validate_coordinates
from app.evidence.schemas import EvidenceRecord, VerificationState

logger = logging.getLogger(__name__)


@dataclass
class HistoricalHazardRecord:
    """A verified historical coastal hazard observation record."""
    event_id: str
    name: str
    hazard_type: str  # e.g. "cyclone_storm_surge", "swell_surge_kallakkadal"
    agency: str
    official_reference: str
    provenance_url: str
    start_time: datetime
    end_time: datetime
    peak_time: datetime
    peak_wave_height_m: float
    peak_wind_gust_kmh: float
    latitude: float
    longitude: float
    affected_sectors: List[str]
    observed_impacts: str
    data_category: str = "observed_historical_hazard"
    crs: str = "EPSG:4326"
    limitations: str = (
        "Historical observation derived from moored ocean buoys and post-event survey data. "
        "Represents observed conditions during past meteorological events; not a real-time observation."
    )
    hash: str = field(init=False)

    def __post_init__(self):
        validate_coordinates(self.latitude, self.longitude)
        # Compute canonical hash
        content = {
            "event_id": self.event_id,
            "name": self.name,
            "hazard_type": self.hazard_type,
            "agency": self.agency,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "peak_wave_height_m": self.peak_wave_height_m,
            "peak_wind_gust_kmh": self.peak_wind_gust_kmh,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "affected_sectors": sorted(self.affected_sectors),
        }
        raw_str = json.dumps(content, sort_keys=True)
        self.hash = hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "name": self.name,
            "hazard_type": self.hazard_type,
            "agency": self.agency,
            "official_reference": self.official_reference,
            "provenance_url": self.provenance_url,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "peak_time": self.peak_time.isoformat(),
            "peak_wave_height_m": self.peak_wave_height_m,
            "peak_wind_gust_kmh": self.peak_wind_gust_kmh,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "affected_sectors": self.affected_sectors,
            "observed_impacts": self.observed_impacts,
            "data_category": self.data_category,
            "crs": self.crs,
            "limitations": self.limitations,
            "hash": self.hash,
        }


# Canonical verified historical hazard observations
VERIFIED_HISTORICAL_HAZARDS: List[HistoricalHazardRecord] = [
    HistoricalHazardRecord(
        event_id="hist_hazard_tauktae_2021",
        name="Extremely Severe Cyclonic Storm Tauktae",
        hazard_type="cyclone_storm_surge",
        agency="India Meteorological Department (IMD) & INCOIS",
        official_reference="IMD RSMC Tropical Cyclones Report 2021; INCOIS Wave Rider Buoy 23001 & CB02",
        provenance_url="https://mausam.imd.gov.in",
        start_time=datetime(2021, 5, 14, 3, 0, tzinfo=timezone.utc),
        end_time=datetime(2021, 5, 19, 12, 0, tzinfo=timezone.utc),
        peak_time=datetime(2021, 5, 15, 18, 0, tzinfo=timezone.utc),
        peak_wave_height_m=5.8,
        peak_wind_gust_kmh=85.0,
        latitude=13.10,
        longitude=73.20,
        affected_sectors=["Ullal", "Mangaluru Bengre Spit", "Malpe", "Padubidri", "Kundapura"],
        observed_impacts=(
            "Severe coastal erosion along Ullal shoreline, sea wall collapse over 200m stretch, "
            "seawater ingress into 120+ fishing settlements, and suspension of fishing operations at NMPT and Malpe."
        ),
    ),
    HistoricalHazardRecord(
        event_id="hist_hazard_ockhi_2017",
        name="Very Severe Cyclonic Storm Ockhi",
        hazard_type="cyclone_storm_surge",
        agency="India Meteorological Department (IMD) & INCOIS",
        official_reference="IMD Report on Cyclonic Disturbances over North Indian Ocean 2017; INCOIS High Wave Bulletin",
        provenance_url="https://mausam.imd.gov.in",
        start_time=datetime(2017, 11, 29, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2017, 12, 6, 0, 0, tzinfo=timezone.utc),
        peak_time=datetime(2017, 12, 2, 12, 0, tzinfo=timezone.utc),
        peak_wave_height_m=4.5,
        peak_wind_gust_kmh=65.0,
        latitude=12.80,
        longitude=73.00,
        affected_sectors=["Mangaluru Bunder", "Ullal", "Someshwara"],
        observed_impacts=(
            "High swell surges leading to sea water ingress into coastal residential hamlets at Ullal and Someshwara; "
            "beach erosion and temporary grounding of traditional fishing crafts."
        ),
    ),
    HistoricalHazardRecord(
        event_id="hist_hazard_nisarga_2020",
        name="Severe Cyclonic Storm Nisarga",
        hazard_type="cyclone_storm_surge",
        agency="India Meteorological Department (IMD) & INCOIS",
        official_reference="IMD RSMC Report No. Cyclone/2020/02; INCOIS Wave Forecast Verification",
        provenance_url="https://mausam.imd.gov.in",
        start_time=datetime(2020, 6, 1, 6, 0, tzinfo=timezone.utc),
        end_time=datetime(2020, 6, 4, 12, 0, tzinfo=timezone.utc),
        peak_time=datetime(2020, 6, 2, 12, 0, tzinfo=timezone.utc),
        peak_wave_height_m=4.2,
        peak_wind_gust_kmh=60.0,
        latitude=13.50,
        longitude=72.80,
        affected_sectors=["Udupi", "Malpe", "Kaup"],
        observed_impacts=(
            "Rough to very rough sea conditions, coastal overtopping in low-lying pockets, "
            "150mm heavy rainfall recorded across coastal Udupi taluks."
        ),
    ),
    HistoricalHazardRecord(
        event_id="hist_hazard_kallakkadal_2024",
        name="Kallakkadal High Swell Surge Event",
        hazard_type="swell_surge_kallakkadal",
        agency="Indian National Centre for Ocean Information Services (INCOIS)",
        official_reference="INCOIS Ocean State Forecast Special Bulletin / Kallakkadal Warning (May 2024)",
        provenance_url="https://incois.gov.in",
        start_time=datetime(2024, 5, 4, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2024, 5, 6, 23, 59, tzinfo=timezone.utc),
        peak_time=datetime(2024, 5, 5, 14, 0, tzinfo=timezone.utc),
        peak_wave_height_m=2.8,
        peak_wind_gust_kmh=35.0,
        latitude=12.91,
        longitude=74.85,
        affected_sectors=["Ullal", "Panambur", "Malpe", "Padubidri"],
        observed_impacts=(
            "Sudden high swell surge without local atmospheric depression, sea water overtopping coastal road at Ullal, "
            "flooding shore-side fish landing zones with 16-18s period waves."
        ),
    ),
]


def get_historical_hazard_records(
    hazard_type: Optional[str] = None,
) -> List[HistoricalHazardRecord]:
    """Retrieve verified historical hazard records, optionally filtered by hazard type."""
    if not hazard_type:
        return list(VERIFIED_HISTORICAL_HAZARDS)
    return [r for r in VERIFIED_HISTORICAL_HAZARDS if r.hazard_type.lower() == hazard_type.lower()]


def match_historical_precedents(
    query: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    max_distance_km: float = 350.0,
) -> List[HistoricalHazardRecord]:
    """
    Match relevant historical storm or surge precedents based on query text or geographic proximity.
    """
    q_lower = (query or "").lower()
    matches: List[HistoricalHazardRecord] = []
    seen_ids = set()

    for rec in VERIFIED_HISTORICAL_HAZARDS:
        # Check explicit keyword mentions (e.g. "tauktae", "ockhi", "nisarga", "cyclone", "surge", "kallakkadal")
        name_words = rec.name.lower().split()
        if any(w in q_lower for w in name_words if len(w) > 4):
            if rec.event_id not in seen_ids:
                matches.append(rec)
                seen_ids.add(rec.event_id)
                continue

        # Check if query asks for historical context or previous cyclones
        if any(term in q_lower for term in ["historical", "precedent", "past storm", "previous cyclone", "record"]):
            if rec.event_id not in seen_ids:
                matches.append(rec)
                seen_ids.add(rec.event_id)
                continue

        # Check spatial proximity if coordinates available
        if lat is not None and lon is not None:
            try:
                dist = haversine_distance_km(lat, lon, rec.latitude, rec.longitude)
                if dist <= max_distance_km and rec.event_id not in seen_ids:
                    # If query also relates to cyclones, storms, high waves, or coastal risk
                    if any(kw in q_lower for kw in ["cyclone", "storm", "wave", "surge", "erosion", "hazard", "risk", "impact", "coastal"]):
                        matches.append(rec)
                        seen_ids.add(rec.event_id)
            except Exception:
                pass

    return matches


def build_historical_evidence_record(rec: HistoricalHazardRecord) -> EvidenceRecord:
    """Build an EvidenceRecord for a historical hazard observation."""
    return EvidenceRecord(
        evidence_id=f"evi_hist_{rec.event_id}",
        source_name=rec.agency,
        source_url=rec.provenance_url,
        source_identifier=rec.official_reference,
        observation_time=rec.peak_time,
        retrieval_time=datetime.now(timezone.utc),
        latitude=rec.latitude,
        longitude=rec.longitude,
        data_type="historical_hazard_observation",
        raw_data=rec.to_dict(),
        units={"wave_height": "m", "wind_gust": "km/h"},
        dataset_metadata={
            "agency": rec.agency,
            "data_category": rec.data_category,
            "crs": rec.crs,
            "temporal_range": f"{rec.start_time.isoformat()} to {rec.end_time.isoformat()}",
        },
        hash=rec.hash,
    )


def build_historical_finding(
    investigation_id: str,
    finding_seq: int,
    rec: HistoricalHazardRecord,
) -> Finding:
    """Build an evidence-backed Finding for a matched historical precedent."""
    claim = (
        f"Historical precedent: {rec.name} ({rec.start_time.year}) produced peak observed waves "
        f"of {rec.peak_wave_height_m:.1f} m and gusts of {rec.peak_wind_gust_kmh:.0f} km/h, "
        f"impacting {', '.join(rec.affected_sectors[:3])}."
    )
    return Finding(
        finding_id=f"f_coastal_{investigation_id}_{finding_seq}",
        claim=claim,
        value=rec.peak_wave_height_m,
        unit="m",
        evidence_ids=[f"evi_hist_{rec.event_id}"],
        uncertainty=(
            f"Observed peak values recorded by {rec.agency} ({rec.official_reference}). "
            f"Impact context: {rec.observed_impacts}"
        ),
        is_forecast=False,
        verification_state=VerificationState.UNVERIFIED,
    )
