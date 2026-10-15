"""
ORCA Coastal Impact & Risk Agent (Person 3 Implementation).

Analyzes spatial relationships between hazard footprints (cyclone cones, surge polygons,
impact buffers) and verified coastal settlements, critical infrastructure, and populations.
Computes deterministic intersections, geodesic distances, and population exposure sums.
Produces evidence-backed findings adhering to the shared ORCA agent contract.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.agents.base import (
    AgentResult,
    AgentStatus,
    BaseAgent,
    Finding,
    InvestigationTask,
)
from app.agents.coastal_risk.reference_data import (
    DATA_SOURCE_METADATA,
    VERIFIED_COASTAL_FEATURES,
)
from app.agents.coastal_risk.spatial import (
    geometry_centroid,
    haversine_distance_km,
    parse_hazard_bbox,
    point_in_bbox,
    point_in_geojson_geometry,
    validate_coordinates,
)
from app.evidence.schemas import EvidenceRecord, VerificationState

logger = logging.getLogger(__name__)


class CoastalRiskAgent(BaseAgent):
    """
    Agent 3: Coastal Impact & Risk Agent (Assigned: Person 3)
    Responsibilities:
    - Bounded coastal feature queries (settlements, ports, hospitals, mangroves).
    - Deterministic spatial intersections with GeoJSON hazard polygons, bounding boxes, or buffer radii.
    - Geodesic distance calculations using the Haversine formula (WGS84).
    - Conservative, evidence-backed population exposure summation without double-counting.
    - Transparent documentation of uncertainties, data vintages, and physical limitations.
    """

    agent_id: str = "coastal_risk"
    name: str = "Coastal Impact & Risk Agent"
    description: str = (
        "Analyzes how hazard footprints intersect coastal settlements, "
        "critical infrastructure, and estimated exposed populations."
    )

    async def run(self, task: InvestigationTask) -> AgentResult:
        """
        Execute deterministic coastal risk analysis for the given investigation task.
        """
        findings: List[Finding] = []
        evidence: List[EvidenceRecord] = []
        limitations: List[str] = [
            "Proximity or polygon intersection indicates potential exposure, but does not "
            "model hydrodynamic inundation depth or wave force without local bathymetry and DEM data.",
            "Population figures reflect official Census counts and do not account for real-time "
            "transient, tourist, or floating populations."
        ]
        errors: List[str] = []

        # 1. Parse and validate hazard spatial inputs
        hazard_geom, hazard_bbox, hazard_center, impact_radius_km, parse_err = self._extract_hazard_inputs(task)
        if parse_err:
            errors.append(parse_err)
            return AgentResult(
                agent_id=self.agent_id,
                status=AgentStatus.FAILED,
                findings=[],
                evidence=[],
                limitations=limitations,
                errors=errors,
                metadata={"investigation_id": task.investigation_id},
            )

        # If no spatial hazard footprint or coordinates supplied
        if not hazard_geom and not hazard_bbox and not (hazard_center and impact_radius_km):
            limitations.append(
                "No spatial hazard geometry, bounding box, or center coordinates with radius provided. "
                "Unable to perform spatial intersection."
            )
            return AgentResult(
                agent_id=self.agent_id,
                status=AgentStatus.UNAVAILABLE,
                findings=[],
                evidence=[],
                limitations=limitations,
                errors=[],
                metadata={"investigation_id": task.investigation_id},
            )

        # 2. Retrieve coastal features (from DB if available, fallback to verified baseline)
        features, db_offline = await self._load_coastal_features()
        if db_offline:
            limitations.append(
                "Local PostgreSQL database is currently offline; analysis performed using "
                "the verified Karnataka regional coastal reference dataset."
            )

        if not features:
            limitations.append("No coastal feature records available in the target study area.")
            return AgentResult(
                agent_id=self.agent_id,
                status=AgentStatus.PARTIAL,
                findings=[],
                evidence=[],
                limitations=limitations,
                errors=errors,
                metadata={"investigation_id": task.investigation_id},
            )

        # Determine reference center point for distance calculations
        ref_lat, ref_lon = self._get_reference_center(hazard_geom, hazard_bbox, hazard_center, task)

        # 3. Perform deterministic spatial screening & intersections
        intersected_features: List[Dict[str, Any]] = []
        proximity_features: List[Tuple[Dict[str, Any], float]] = []

        for feat in features:
            f_lat = feat.get("latitude")
            f_lon = feat.get("longitude")
            if f_lat is None or f_lon is None:
                continue

            try:
                validate_coordinates(f_lat, f_lon)
            except ValueError:
                continue

            dist_km = haversine_distance_km(f_lat, f_lon, ref_lat, ref_lon) if (ref_lat is not None and ref_lon is not None) else None
            proximity_features.append((feat, dist_km if dist_km is not None else float("inf")))

            # Check polygon intersection
            is_intersecting = False
            if hazard_geom:
                try:
                    if point_in_geojson_geometry(f_lat, f_lon, hazard_geom):
                        is_intersecting = True
                except Exception as e:
                    errors.append(f"Geometry intersection test error for feature '{feat.get('name')}': {e}")

            # Check bbox intersection if bbox provided
            elif hazard_bbox:
                min_lon, min_lat, max_lon, max_lat = hazard_bbox
                if point_in_bbox(f_lat, f_lon, min_lon, min_lat, max_lon, max_lat):
                    is_intersecting = True

            # Check radial buffer intersection
            elif hazard_center and impact_radius_km:
                if dist_km is not None and dist_km <= impact_radius_km:
                    is_intersecting = True

            if is_intersecting:
                intersected_features.append(feat)

        # 4. Generate verifiable evidence records for intersected features
        for feat in intersected_features:
            ev_id = f"evi_cf_{feat['id']}"
            raw_payload_str = json.dumps(feat, sort_keys=True)
            ev_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()

            evidence.append(
                EvidenceRecord(
                    evidence_id=ev_id,
                    source_name=DATA_SOURCE_METADATA["provider"],
                    source_url=DATA_SOURCE_METADATA["url"],
                    source_identifier=feat.get("source_identifier", feat["id"]),
                    observation_time=datetime(feat.get("census_year") or 2024, 1, 1, tzinfo=timezone.utc),
                    retrieval_time=datetime.now(timezone.utc),
                    latitude=feat["latitude"],
                    longitude=feat["longitude"],
                    data_type="coastal_feature",
                    raw_data=feat,
                    units={"population": "persons", "distance": "km"},
                    dataset_metadata={
                        "license": DATA_SOURCE_METADATA["license"],
                        "study_area": DATA_SOURCE_METADATA["study_area"]["region"],
                        "crs": "EPSG:4326",
                    },
                    hash=ev_hash,
                )
            )

        # 5. Synthesize atomic findings backed by evidence
        finding_seq = 1
        hazard_ref_id = task.parameters.get("hazard_event_id", "unspecified_hazard")

        if not intersected_features:
            # Honest zero-intersection finding
            findings.append(
                Finding(
                    finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                    claim=(
                        f"Zero coastal settlements or critical infrastructure facilities intersect the "
                        f"supplied hazard footprint ({hazard_ref_id})."
                    ),
                    value=0.0,
                    unit="features",
                    evidence_ids=[],
                    uncertainty="Screening evaluated against verified Karnataka coastal database.",
                    is_forecast=False,
                    verification_state=VerificationState.UNVERIFIED,
                )
            )
            finding_seq += 1

            # Report nearest coastal feature distance if reference center available
            if proximity_features:
                proximity_features.sort(key=lambda x: x[1])
                nearest_feat, nearest_dist = proximity_features[0]
                if nearest_dist != float("inf"):
                    findings.append(
                        Finding(
                            finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                            claim=(
                                f"Nearest coastal feature is '{nearest_feat['name']}' ({nearest_feat['feature_type']}) "
                                f"located {nearest_dist:.1f} km from the hazard reference center."
                            ),
                            value=round(nearest_dist, 2),
                            unit="km",
                            evidence_ids=[],
                            uncertainty="Geodesic distance calculated via Haversine formula.",
                            is_forecast=False,
                            verification_state=VerificationState.UNVERIFIED,
                        )
                    )
        else:
            # Categorize features
            settlements = [f for f in intersected_features if f.get("feature_type") == "settlement"]
            ports = [f for f in intersected_features if f.get("feature_type") == "port"]
            hospitals = [f for f in intersected_features if f.get("feature_type") == "hospital"]
            ecological = [f for f in intersected_features if f.get("feature_type") in ("mangrove", "protected_area")]

            # Population finding (settlement exposure)
            if settlements:
                total_pop = 0
                counted_settlements = set()
                ev_ids = []
                for s in settlements:
                    s_id = s["id"]
                    if s_id not in counted_settlements:
                        pop = s.get("estimated_population") or 0
                        total_pop += pop
                        counted_settlements.add(s_id)
                        ev_ids.append(f"evi_cf_{s_id}")

                settlement_names = ", ".join(s["name"] for s in settlements[:4])
                if len(settlements) > 4:
                    settlement_names += f" and {len(settlements) - 4} others"

                findings.append(
                    Finding(
                        finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                        claim=(
                            f"Estimated {total_pop:,} residents across {len(settlements)} coastal settlement(s) "
                            f"({settlement_names}) fall within the hazard footprint."
                        ),
                        value=float(total_pop),
                        unit="people",
                        evidence_ids=ev_ids,
                        uncertainty=(
                            "Summed from Census of India 2011 official counts. Represents residential "
                            "headcount within municipal/settlement bounds; not a casualty forecast."
                        ),
                        is_forecast=False,
                        verification_state=VerificationState.UNVERIFIED,
                    )
                )
                finding_seq += 1

            # Maritime / Port infrastructure finding
            if ports:
                port_names = ", ".join(p["name"] for p in ports)
                port_ev_ids = [f"evi_cf_{p['id']}" for p in ports]
                findings.append(
                    Finding(
                        finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                        claim=f"{len(ports)} maritime port/harbour facility(ies) intersect the hazard footprint: {port_names}.",
                        value=float(len(ports)),
                        unit="ports",
                        evidence_ids=port_ev_ids,
                        uncertainty="Spatial point/polygon intersection based on OpenStreetMap maritime records.",
                        is_forecast=False,
                        verification_state=VerificationState.UNVERIFIED,
                    )
                )
                finding_seq += 1

            # Critical healthcare infrastructure finding
            if hospitals:
                hosp_names = ", ".join(h["name"] for h in hospitals)
                hosp_ev_ids = [f"evi_cf_{h['id']}" for h in hospitals]
                findings.append(
                    Finding(
                        finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                        claim=f"{len(hospitals)} apex healthcare facility(ies) located within the hazard zone: {hosp_names}.",
                        value=float(len(hospitals)),
                        unit="facilities",
                        evidence_ids=hosp_ev_ids,
                        uncertainty="Critical emergency response facilities verified in district administrative register.",
                        is_forecast=False,
                        verification_state=VerificationState.UNVERIFIED,
                    )
                )
                finding_seq += 1

            # Ecological / Mangrove habitat finding
            if ecological:
                eco_names = ", ".join(e["name"] for e in ecological)
                eco_ev_ids = [f"evi_cf_{e['id']}" for e in ecological]
                findings.append(
                    Finding(
                        finding_id=f"f_coastal_{task.investigation_id}_{finding_seq}",
                        claim=f"{len(ecological)} critical ecological habitat(s) intersect the hazard zone: {eco_names}.",
                        value=float(len(ecological)),
                        unit="habitats",
                        evidence_ids=eco_ev_ids,
                        uncertainty="Ecosystem buffers cataloged per Karnataka State Coastal Zone Management Authority.",
                        is_forecast=False,
                        verification_state=VerificationState.UNVERIFIED,
                    )
                )
                finding_seq += 1

        status = AgentStatus.PARTIAL if (db_offline or errors) else AgentStatus.COMPLETED

        return AgentResult(
            agent_id=self.agent_id,
            status=status,
            findings=findings,
            evidence=evidence,
            limitations=limitations,
            errors=errors,
            metadata={
                "investigation_id": task.investigation_id,
                "features_analyzed": len(features),
                "features_intersected": len(intersected_features),
                "spatial_crs": "EPSG:4326",
            },
        )

    def _extract_hazard_inputs(
        self, task: InvestigationTask
    ) -> Tuple[
        Optional[Dict[str, Any]],
        Optional[Tuple[float, float, float, float]],
        Optional[Dict[str, float]],
        Optional[float],
        Optional[str],
    ]:
        """
        Extract and validate hazard spatial footprint parameters.
        Returns: (hazard_geom, hazard_bbox, hazard_center, impact_radius_km, error_message)
        """
        params = task.parameters or {}

        hazard_geom = params.get("hazard_geometry")
        if hazard_geom:
            if not isinstance(hazard_geom, dict) or "type" not in hazard_geom or "coordinates" not in hazard_geom:
                return None, None, None, None, "Malformed 'hazard_geometry': must be GeoJSON dictionary with 'type' and 'coordinates'."

        hazard_bbox_raw = params.get("hazard_bbox")
        hazard_bbox = None
        if hazard_bbox_raw:
            try:
                hazard_bbox = parse_hazard_bbox(hazard_bbox_raw)
            except ValueError as ve:
                return None, None, None, None, f"Invalid 'hazard_bbox': {ve}"

        hazard_center = params.get("hazard_center")
        if hazard_center:
            if not isinstance(hazard_center, dict) or "latitude" not in hazard_center or "longitude" not in hazard_center:
                return None, None, None, None, "Malformed 'hazard_center': must be dict with 'latitude' and 'longitude'."
            try:
                validate_coordinates(hazard_center["latitude"], hazard_center["longitude"])
            except ValueError as ve:
                return None, None, None, None, f"Invalid 'hazard_center' coordinates: {ve}"

        impact_radius_km = params.get("impact_radius_km")
        if impact_radius_km is not None:
            try:
                impact_radius_km = float(impact_radius_km)
                if impact_radius_km < 0:
                    return None, None, None, None, "Negative 'impact_radius_km' is not valid."
            except (ValueError, TypeError):
                return None, None, None, None, "'impact_radius_km' must be a numeric value."

        # Fallback to top-level task attributes if parameters did not specify center/radius
        if not hazard_geom and not hazard_bbox and not hazard_center:
            if task.latitude is not None and task.longitude is not None:
                try:
                    validate_coordinates(task.latitude, task.longitude)
                    hazard_center = {"latitude": task.latitude, "longitude": task.longitude}
                    if task.radius_km is not None:
                        impact_radius_km = float(task.radius_km)
                except ValueError as ve:
                    return None, None, None, None, f"Invalid top-level task coordinates: {ve}"

        return hazard_geom, hazard_bbox, hazard_center, impact_radius_km, None

    def _get_reference_center(
        self,
        hazard_geom: Optional[Dict[str, Any]],
        hazard_bbox: Optional[Tuple[float, float, float, float]],
        hazard_center: Optional[Dict[str, float]],
        task: InvestigationTask,
    ) -> Tuple[Optional[float], Optional[float]]:
        """Calculate a reference center point (lat, lon) for proximity calculations."""
        if hazard_center:
            return hazard_center["latitude"], hazard_center["longitude"]

        if hazard_geom:
            try:
                return geometry_centroid(hazard_geom)
            except Exception:
                pass

        if hazard_bbox:
            min_lon, min_lat, max_lon, max_lat = hazard_bbox
            return (min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0

        if task.latitude is not None and task.longitude is not None:
            return task.latitude, task.longitude

        return None, None

    _db_available: Optional[bool] = None

    async def _load_coastal_features(self) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Load coastal features from PostgreSQL database if available,
        otherwise fall back safely to the verified reference dataset.
        Returns: (features_list, db_offline_flag)
        """
        # If previously determined to be offline, return reference dataset immediately
        if CoastalRiskAgent._db_available is False:
            return VERIFIED_COASTAL_FEATURES, True

        try:
            import asyncio
            from app.db.session import AsyncSessionLocal
            from app.models import CoastalFeature
            from sqlalchemy import select

            async def _query():
                async with AsyncSessionLocal() as session:
                    stmt = select(CoastalFeature)
                    result = await session.execute(stmt)
                    return result.scalars().all()

            # Fast 0.5s timeout so offline DB does not delay unit tests or agent response
            db_features = await asyncio.wait_for(_query(), timeout=0.5)

            if db_features:
                CoastalRiskAgent._db_available = True
                features = []
                for f in db_features:
                    features.append({
                        "id": f.id,
                        "name": f.name,
                        "feature_type": f.feature_type,
                        "latitude": f.latitude,
                        "longitude": f.longitude,
                        "geojson_geometry": f.geojson_geometry,
                        "estimated_population": f.estimated_population,
                        "source_identifier": f"db:coastal_features:{f.id}",
                    })
                return features, False
        except Exception as e:
            CoastalRiskAgent._db_available = False
            logger.info("Database unavailable for coastal feature query, using reference data: %s", e)

        # Verified reference fallback
        return VERIFIED_COASTAL_FEATURES, True
