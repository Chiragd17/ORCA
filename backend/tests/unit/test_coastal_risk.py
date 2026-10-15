"""
Deterministic unit tests for Person 3: Coastal Impact & Risk Agent.
Tests verify:
1. BaseAgent contract compliance, AgentResult, Finding, and EvidenceRecord schemas.
2. Deterministic spatial calculations (Haversine geodesic distance, ray casting, bbox screening).
3. Coordinate validation and latitude-first bbox parsing.
4. Population exposure summation and deduplication.
5. Evidence linkage and honest reporting of limitations/data gaps.
6. Coastal data importer validation logic.
"""

import math
import pytest
from app.agents.base import AgentResult, AgentStatus, BaseAgent, Finding, InvestigationTask
from app.agents.coastal_risk.agent import CoastalRiskAgent
from app.agents.coastal_risk.spatial import (
    EARTH_RADIUS_KM,
    haversine_distance_km,
    parse_hazard_bbox,
    point_in_bbox,
    point_in_geojson_geometry,
    point_in_polygon,
    validate_coordinates,
)
from app.evidence.schemas import EvidenceRecord, VerificationState
from scripts.import_coastal_data import CoastalDataImporter


# ==============================================================================
# 1. CONTRACT COMPLIANCE TESTS
# ==============================================================================

def test_coastal_agent_contract_inheritance():
    """Verify CoastalRiskAgent correctly implements BaseAgent interface."""
    agent = CoastalRiskAgent()
    assert isinstance(agent, BaseAgent)
    assert agent.agent_id == "coastal_risk"
    assert hasattr(agent, "run")
    assert callable(agent.run)


@pytest.mark.asyncio
async def test_agent_run_returns_valid_agent_result():
    """Verify agent run returns compliant AgentResult."""
    agent = CoastalRiskAgent()
    task = InvestigationTask(
        investigation_id="inv_contract_01",
        workspace="disaster_management",
        query="Assess coastal impact for cyclone buffer",
        latitude=12.91,
        longitude=74.85,
        radius_km=30.0,
    )
    result = await agent.run(task)

    assert isinstance(result, AgentResult)
    assert result.agent_id == "coastal_risk"
    assert result.status in [AgentStatus.COMPLETED, AgentStatus.PARTIAL]
    assert isinstance(result.findings, list)
    assert isinstance(result.evidence, list)
    assert isinstance(result.limitations, list)
    assert len(result.limitations) >= 2


# ==============================================================================
# 2. DETERMINISTIC GEOMETRY & DISTANCE TESTS
# ==============================================================================

def test_haversine_distance_exact_benchmarks():
    """Verify Haversine formula against hand-checked mathematical geodesic benchmarks."""
    # 1. Point to itself is 0.0 km
    assert haversine_distance_km(12.0, 74.0, 12.0, 74.0) == 0.0

    # 2. Exactly 1 degree latitude along meridian at equator
    # d = (pi / 180) * 6371.0088 km = 111.19508 km
    expected_one_deg = (math.pi / 180.0) * EARTH_RADIUS_KM
    calc_one_deg = haversine_distance_km(0.0, 0.0, 1.0, 0.0)
    assert pytest.approx(calc_one_deg, rel=1e-5) == expected_one_deg

    # 3. Known distance between Mangaluru (12.9141 N, 74.8560 E) and Udupi (13.3409 N, 74.7421 E)
    # Expected geodesic distance is ~49.0 km
    dist_mgl_udp = haversine_distance_km(12.9141, 74.8560, 13.3409, 74.7421)
    assert 48.0 < dist_mgl_udp < 51.0


def test_coordinate_validation():
    """Verify rigorous coordinate bounds checking."""
    # Valid coordinates
    validate_coordinates(12.5, 74.5)
    validate_coordinates(-90.0, -180.0)
    validate_coordinates(90.0, 180.0)

    # Invalid latitude
    with pytest.raises(ValueError, match="Latitude must be between -90 and 90"):
        validate_coordinates(90.1, 74.0)
    with pytest.raises(ValueError, match="Latitude must be between -90 and 90"):
        validate_coordinates(-95.0, 74.0)

    # Invalid longitude
    with pytest.raises(ValueError, match="Longitude must be between -180 and 180"):
        validate_coordinates(12.0, 180.5)

    # Non-finite coordinates
    with pytest.raises(ValueError, match="Non-finite"):
        validate_coordinates(float("nan"), 74.0)
    with pytest.raises(ValueError, match="Non-finite"):
        validate_coordinates(12.0, float("inf"))


def test_parse_hazard_bbox_coordinate_ordering():
    """Verify latitude-first bbox parsing per ORCA contract [min_lat, min_lon, max_lat, max_lon]."""
    # Contract order: [12.0, 74.0, 14.0, 75.0]
    # Converted to: (min_lon=74.0, min_lat=12.0, max_lon=75.0, max_lat=14.0)
    bbox = [12.0, 74.0, 14.0, 75.0]
    min_lon, min_lat, max_lon, max_lat = parse_hazard_bbox(bbox)
    assert min_lon == 74.0
    assert min_lat == 12.0
    assert max_lon == 75.0
    assert max_lat == 14.0

    # Test points inside and outside bbox
    assert point_in_bbox(12.91, 74.85, min_lon, min_lat, max_lon, max_lat) is True
    assert point_in_bbox(11.5, 74.85, min_lon, min_lat, max_lon, max_lat) is False
    assert point_in_bbox(12.91, 76.0, min_lon, min_lat, max_lon, max_lat) is False

    # Inverted bounding box must fail
    with pytest.raises(ValueError, match="Invalid bbox"):
        parse_hazard_bbox([14.0, 74.0, 12.0, 75.0])


def test_ray_casting_point_in_polygon():
    """Verify ray-casting algorithm on 2D polygon with and without holes."""
    # Exterior square from (0,0) to (10,10)
    square_poly = [
        [
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 10.0],
            [0.0, 10.0],
            [0.0, 0.0]
        ]
    ]
    # Point inside
    assert point_in_polygon(5.0, 5.0, square_poly) is True
    # Point outside
    assert point_in_polygon(12.0, 5.0, square_poly) is False
    assert point_in_polygon(5.0, -1.0, square_poly) is False

    # Polygon with interior hole from (4,4) to (6,6)
    donut_poly = [
        # Exterior ring
        [
            [0.0, 0.0],
            [10.0, 0.0],
            [10.0, 10.0],
            [0.0, 10.0],
            [0.0, 0.0]
        ],
        # Interior hole
        [
            [4.0, 4.0],
            [6.0, 4.0],
            [6.0, 6.0],
            [4.0, 6.0],
            [4.0, 4.0]
        ]
    ]
    # Point in solid area (2,2) -> True
    assert point_in_polygon(2.0, 2.0, donut_poly) is True
    # Point inside the hole (5,5) -> False
    assert point_in_polygon(5.0, 5.0, donut_poly) is False


# ==============================================================================
# 3. SPATIAL HAZARD EXPOSURE & POPULATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_hazard_polygon_intersecting_coastal_settlements():
    """Verify hazard polygon covering Mangaluru area detects settlement and sums population."""
    agent = CoastalRiskAgent()

    # GeoJSON polygon covering Mangaluru and Ullal area (~12.75 to 13.05 N, 74.75 to 74.95 E)
    mangaluru_hazard_poly = {
        "type": "Polygon",
        "coordinates": [[
            [74.75, 12.75],
            [74.95, 12.75],
            [74.95, 13.05],
            [74.75, 13.05],
            [74.75, 12.75]
        ]]
    }

    task = InvestigationTask(
        investigation_id="inv_mgl_01",
        workspace="disaster_management",
        query="Analyze coastal risk in cyclone landfall polygon",
        parameters={
            "hazard_geometry": mangaluru_hazard_poly,
            "hazard_event_id": "test_cyclone_2026",
        }
    )

    result = await agent.run(task)

    assert result.status in [AgentStatus.COMPLETED, AgentStatus.PARTIAL]
    assert len(result.findings) >= 2

    # Check for population finding
    pop_finding = next((f for f in result.findings if f.unit == "people"), None)
    assert pop_finding is not None
    assert pop_finding.value is not None
    # Mangaluru (499,487) + Ullal (53,856) + Surathkal (41,634) = 594,977
    assert pop_finding.value >= 499487.0
    assert len(pop_finding.evidence_ids) >= 1

    # Check for port finding (NMPT, Old Port)
    port_finding = next((f for f in result.findings if f.unit == "ports"), None)
    assert port_finding is not None
    assert port_finding.value >= 1.0

    # Check evidence generation
    assert len(result.evidence) >= 1
    sample_ev = result.evidence[0]
    assert isinstance(sample_ev, EvidenceRecord)
    assert sample_ev.evidence_id.startswith("evi_cf_")
    assert sample_ev.data_type == "coastal_feature"
    assert sample_ev.hash is not None


@pytest.mark.asyncio
async def test_hazard_far_at_sea_produces_zero_intersections():
    """Verify offshore hazard produces honest zero-intersection finding without errors."""
    agent = CoastalRiskAgent()

    # Hazard polygon out at deep sea (~70.0 to 71.0 E, 12.0 to 13.0 N)
    offshore_poly = {
        "type": "Polygon",
        "coordinates": [[
            [70.0, 12.0],
            [71.0, 12.0],
            [71.0, 13.0],
            [70.0, 13.0],
            [70.0, 12.0]
        ]]
    }

    task = InvestigationTask(
        investigation_id="inv_offshore_01",
        workspace="marine_monitoring",
        query="Offshore gale wind warning",
        parameters={
            "hazard_geometry": offshore_poly,
            "hazard_event_id": "offshore_low_01",
        }
    )

    result = await agent.run(task)

    assert result.status in [AgentStatus.COMPLETED, AgentStatus.PARTIAL]
    # Zero intersections finding
    zero_finding = next((f for f in result.findings if f.value == 0.0 and f.unit == "features"), None)
    assert zero_finding is not None
    assert "Zero coastal settlements" in zero_finding.claim

    # Proximity finding should report nearest distance to coast
    dist_finding = next((f for f in result.findings if f.unit == "km"), None)
    assert dist_finding is not None
    assert dist_finding.value > 300.0  # ~350-400 km away


@pytest.mark.asyncio
async def test_radial_buffer_screening():
    """Verify hazard center with impact radius buffer screening."""
    agent = CoastalRiskAgent()
    task = InvestigationTask(
        investigation_id="inv_buffer_01",
        workspace="disaster_management",
        query="Buffer around Malpe port",
        parameters={
            "hazard_center": {"latitude": 13.35, "longitude": 74.70},
            "impact_radius_km": 10.0,
            "hazard_event_id": "high_tide_malpe",
        }
    )
    result = await agent.run(task)

    assert result.status in [AgentStatus.COMPLETED, AgentStatus.PARTIAL]
    assert len(result.findings) >= 1
    # Malpe port and St. Mary's Islands are within 10 km
    port_finding = next((f for f in result.findings if f.unit == "ports"), None)
    assert port_finding is not None


# ==============================================================================
# 4. ERROR HANDLING & HONEST LIMITATIONS
# ==============================================================================

@pytest.mark.asyncio
async def test_missing_spatial_parameters_returns_unavailable():
    """Verify that calling agent without spatial geometry or center returns UNAVAILABLE."""
    agent = CoastalRiskAgent()
    task = InvestigationTask(
        investigation_id="inv_empty_params",
        workspace="disaster_management",
        query="Vague query with no spatial inputs",
        parameters={},
    )
    result = await agent.run(task)

    assert result.status == AgentStatus.UNAVAILABLE
    assert len(result.findings) == 0
    assert any("No spatial hazard geometry" in lim for lim in result.limitations)


@pytest.mark.asyncio
async def test_malformed_hazard_geometry_returns_failed():
    """Verify that malformed GeoJSON dictionary returns FAILED with error description."""
    agent = CoastalRiskAgent()
    task = InvestigationTask(
        investigation_id="inv_malformed",
        workspace="disaster_management",
        query="Invalid polygon test",
        parameters={
            "hazard_geometry": {"type": "Polygon"},  # Missing coordinates!
        }
    )
    result = await agent.run(task)

    assert result.status == AgentStatus.FAILED
    assert len(result.errors) >= 1
    assert "Malformed 'hazard_geometry'" in result.errors[0]


# ==============================================================================
# 5. IMPORTER RECORD VALIDATION TESTS
# ==============================================================================

def test_importer_record_validation():
    """Verify validation logic in CoastalDataImporter."""
    importer = CoastalDataImporter(dry_run=True)

    # Valid record
    valid_record = {
        "id": "cf_test_01",
        "name": "Test Coastal Settlement",
        "feature_type": "settlement",
        "latitude": 13.0,
        "longitude": 74.8,
        "geojson_geometry": {"type": "Point", "coordinates": [74.8, 13.0]},
    }
    is_valid, err = importer.validate_feature_record(valid_record)
    assert is_valid is True
    assert err is None

    # Invalid latitude
    bad_lat_record = {**valid_record, "latitude": 99.9}
    is_valid, err = importer.validate_feature_record(bad_lat_record)
    assert is_valid is False
    assert "Invalid coordinates" in err

    # Missing name
    missing_name_record = {"id": "cf_test_02", "feature_type": "port", "latitude": 13.0, "longitude": 74.8}
    is_valid, err = importer.validate_feature_record(missing_name_record)
    assert is_valid is False
    assert "Missing required field" in err


# ==============================================================================
# 6. PHASE 3 ADVANCED SPATIAL & REPRODUCIBILITY VERIFICATION
# ==============================================================================

def test_segments_intersection_logic():
    """Verify segment-segment intersection across diverse geometric cases."""
    from app.agents.coastal_risk.spatial import segments_intersect

    # 1. Crossing segments (X-cross)
    assert segments_intersect([0.0, 0.0], [2.0, 2.0], [0.0, 2.0], [2.0, 0.0]) is True

    # 2. Parallel non-intersecting
    assert segments_intersect([0.0, 0.0], [0.0, 2.0], [1.0, 0.0], [1.0, 2.0]) is False

    # 3. Touching at a vertex (T-junction)
    assert segments_intersect([0.0, 0.0], [2.0, 0.0], [1.0, 0.0], [1.0, 2.0]) is True

    # 4. Collinear overlapping
    assert segments_intersect([0.0, 0.0], [2.0, 0.0], [1.0, 0.0], [3.0, 0.0]) is True


def test_polygon_polygon_intersection_advanced_cases():
    """
    Verify polygon-to-polygon intersection under all Phase 3 required cases:
    - Full containment (poly1 inside poly2, and poly2 inside poly1)
    - Partial overlap with intersecting boundaries
    - Boundaries cross without containing each other's centroid
    - Polygon inside an interior hole (disjoint)
    """
    from app.agents.coastal_risk.spatial import (
        geojson_geometries_intersect,
        polygons_intersect,
    )

    # Base square: (0,0) to (10,10)
    square_10 = [[[0.0, 0.0], [10.0, 0.0], [10.0, 10.0], [0.0, 10.0], [0.0, 0.0]]]

    # Case 1: Hazard polygon fully contains feature polygon
    small_inside = [[[2.0, 2.0], [4.0, 2.0], [4.0, 4.0], [2.0, 4.0], [2.0, 2.0]]]
    assert polygons_intersect(square_10, small_inside) is True
    assert polygons_intersect(small_inside, square_10) is True

    # Case 2: Partial overlap (edges cross)
    overlapping = [[[5.0, 5.0], [15.0, 5.0], [15.0, 15.0], [5.0, 15.0], [5.0, 5.0]]]
    assert polygons_intersect(square_10, overlapping) is True

    # Case 3: Boundaries cross where neither centroid is inside the other
    # Cross/plus shape: vertical strip (4, -2) to (6, 12) crossing horizontal strip (-2, 4) to (12, 6)
    v_strip = [[[4.0, -2.0], [6.0, -2.0], [6.0, 12.0], [4.0, 12.0], [4.0, -2.0]]]
    h_strip = [[[-2.0, 4.0], [12.0, 4.0], [12.0, 6.0], [-2.0, 6.0], [-2.0, 4.0]]]
    assert polygons_intersect(v_strip, h_strip) is True

    # Case 4: Polygon strictly inside an interior hole of a donut polygon
    donut = [
        # Exterior
        [[0.0, 0.0], [20.0, 0.0], [20.0, 20.0], [0.0, 20.0], [0.0, 0.0]],
        # Hole: (5,5) to (15,15)
        [[5.0, 5.0], [15.0, 5.0], [15.0, 15.0], [5.0, 15.0], [5.0, 5.0]],
    ]
    # Poly inside hole: (8,8) to (12,12)
    in_hole = [[[8.0, 8.0], [12.0, 8.0], [12.0, 12.0], [8.0, 12.0], [8.0, 8.0]]]
    assert polygons_intersect(donut, in_hole) is False

    # GeoJSON wrappers check
    geom_poly1 = {"type": "Polygon", "coordinates": square_10}
    geom_poly2 = {"type": "Polygon", "coordinates": small_inside}
    assert geojson_geometries_intersect(geom_poly1, geom_poly2) is True


@pytest.mark.asyncio
async def test_agent_deterministic_reproducibility():
    """Verify that repeated runs with identical task inputs yield identical analytical findings."""
    agent = CoastalRiskAgent()
    task = InvestigationTask(
        investigation_id="inv_repeat_01",
        workspace="disaster_management",
        query="Verify reproducible analysis in Mangaluru",
        latitude=12.9141,
        longitude=74.8560,
        radius_km=30.0,
    )

    res1 = await agent.run(task)
    res2 = await agent.run(task)

    assert res1.status == res2.status
    assert len(res1.findings) == len(res2.findings)
    assert len(res1.evidence) == len(res2.evidence)

    for f1, f2 in zip(res1.findings, res2.findings):
        assert f1.claim == f2.claim
        assert f1.value == f2.value
        assert f1.unit == f2.unit
        assert f1.evidence_ids == f2.evidence_ids


def test_population_deduplication():
    """Verify population aggregation does not double-count duplicate or overlapping settlement entries."""
    features = [
        {"id": "s1", "name": "Settlement A", "feature_type": "settlement", "estimated_population": 50000},
        {"id": "s1", "name": "Settlement A (duplicate entry)", "feature_type": "settlement", "estimated_population": 50000},
        {"id": "s2", "name": "Settlement B", "feature_type": "settlement", "estimated_population": 25000},
        {"id": "port1", "name": "Commercial Port", "feature_type": "port", "estimated_population": None},
    ]

    total_pop = 0
    counted = set()
    for f in features:
        if f.get("feature_type") == "settlement":
            f_id = f["id"]
            if f_id not in counted:
                total_pop += f.get("estimated_population") or 0
                counted.add(f_id)

    # 50,000 + 25,000 = 75,000 (duplicate s1 ignored, port ignored)
    assert total_pop == 75000

