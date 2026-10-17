import tempfile
from datetime import UTC, datetime
from pathlib import Path

from app.providers.data.ibtracs import IBTrACSClient, sshs_to_category

SAMPLE_IBTRACS_CSV = """SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_SSHS
 ,Year, , , , , , ,degrees_north,degrees_east,kts,mb,1
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 06:00:00,TS,13.3,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-14 06:00:00,TS,11.2,72.2,25,996,-1
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-16 12:00:00,TS,16.5,72.7,90,960,2
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 06:00:00,TS,13.3,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,invalid-time,TS,14.0,72.8,50,985,1
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-17 00:00:00,TS,invalid,72.8,50,985,1
"""


def test_ibtracs_parsing_and_chronological_ordering():
    """Valid rows are parsed into HazardRead with UTC timestamps sorted chronologically."""
    client = IBTrACSClient()
    hazards, stats = client.parse_csv_with_stats(SAMPLE_IBTRACS_CSV)

    assert len(hazards) == 1
    storm = hazards[0]
    assert storm.name == "Cyclone Tauktae"
    assert storm.basin == "arabian_sea"
    assert storm.status == "historical"
    assert storm.type == "cyclone"
    assert storm.source == "NOAA IBTrACS"

    # Should have 3 valid unique chronological points (one duplicate skipped, two invalid rows skipped)
    assert len(storm.track_points) == 3
    assert stats["valid_track_points"] == 3
    assert stats["skipped_invalid_timestamp"] == 1
    assert stats["skipped_invalid_coords"] == 1
    assert stats["duplicate_timestamps"] == 1

    # Check chronological ordering and UTC awareness
    times = [p.time for p in storm.track_points]
    assert times == sorted(times)
    assert times[0] == datetime(2021, 5, 14, 6, 0, tzinfo=UTC)
    assert times[-1] == datetime(2021, 5, 16, 12, 0, tzinfo=UTC)
    assert storm.first_observed == datetime(2021, 5, 14, 6, 0, tzinfo=UTC)
    assert storm.last_observed == datetime(2021, 5, 16, 12, 0, tzinfo=UTC)


def test_missing_sid_handling():
    """Rows with missing or empty SID must be skipped and never imported with null."""
    csv_missing_sid = """SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_SSHS
 ,Year, , , , , , ,degrees_north,degrees_east,kts,mb,1
,2021,30,NI,AS,UNNAMED,2021-05-15 06:00:00,TS,13.3,73.0,45,990,0
   ,2021,30,NI,AS,UNNAMED,2021-05-15 12:00:00,TS,13.5,73.1,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 06:00:00,TS,13.3,73.0,45,990,0
"""
    client = IBTrACSClient()
    hazards, stats = client.parse_csv_with_stats(csv_missing_sid)

    assert len(hazards) == 1
    assert hazards[0].hazard_id == "hz-ibtracs-2021133n10071"
    assert stats["skipped_missing_sid"] == 2
    assert stats["valid_track_points"] == 1


def test_missing_and_out_of_range_coordinates():
    """Coordinates that are missing, invalid, or out-of-range (>90 lat) must be skipped."""
    csv_coords = """SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_SSHS
 ,Year, , , , , , ,degrees_north,degrees_east,kts,mb,1
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 06:00:00,TS,,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 12:00:00,TS,not_a_num,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 18:00:00,TS,95.5,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-16 00:00:00,TS,-95.5,73.0,45,990,0
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-16 06:00:00,TS,15.2,73.4,50,985,0
"""
    client = IBTrACSClient()
    hazards, stats = client.parse_csv_with_stats(csv_coords)

    assert len(hazards) == 1
    assert stats["skipped_invalid_coords"] == 2
    assert stats["skipped_out_of_range"] == 2
    assert stats["valid_track_points"] == 1
    pt = hazards[0].track_points[0]
    assert pt.latitude == 15.2
    assert pt.longitude == 73.4


def test_sentinel_and_missing_values_sanitization():
    """Sentinel values (-999, -999.0, whitespace) must be converted to None, never 0.0."""
    csv_sentinels = """SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_SSHS
 ,Year, , , , , , ,degrees_north,degrees_east,kts,mb,1
2020153N12071,2020,02,NI,AS,NISARGA,2020-06-02 00:00:00,TS,15.0,71.2,-999,-999, 
2020153N12071,2020,02,NI,AS,NISARGA,2020-06-02 06:00:00,TS,15.5,71.5,-999.0,-999.0,-1
2020153N12071,2020,02,NI,AS,NISARGA,2020-06-02 12:00:00,TS,16.0,71.8, , , 
"""
    client = IBTrACSClient()
    hazards, _ = client.parse_csv_with_stats(csv_sentinels)

    assert len(hazards) == 1
    points = hazards[0].track_points
    assert len(points) == 3

    for pt in points:
        assert pt.wind_speed_knots is None, "Sentinel wind must be None, not 0.0"
        assert pt.pressure_hpa is None, "Sentinel pressure must be None, not 0.0"
        assert pt.is_forecast is False


def test_unit_preservation():
    """Wind speed must remain in knots, and pressure must remain in hPa/mb."""
    csv_units = """SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,WMO_PRES,USA_SSHS
 ,Year, , , , , , ,degrees_north,degrees_east,kts,mb,1
2021133N10071,2021,30,NI,AS,TAUKTAE,2021-05-15 06:00:00,TS,13.3,73.0,65.5,978.2,1
"""
    client = IBTrACSClient()
    hazards, _ = client.parse_csv_with_stats(csv_units)
    pt = hazards[0].track_points[0]
    assert pt.wind_speed_knots == 65.5
    assert pt.pressure_hpa == 978.2


def test_sshs_to_category_mapping():
    """Verify standard Saffir-Simpson Hurricane Wind Scale categories and fallbacks."""
    assert sshs_to_category(-5, 20.0) == "Tropical Disturbance"
    assert sshs_to_category(-4, 20.0) == "Tropical Disturbance"
    assert sshs_to_category(-3, 20.0) == "Tropical Disturbance"
    assert sshs_to_category(-2, 20.0) == "Tropical Disturbance"
    assert sshs_to_category(-1, 25.0) == "Tropical Depression"
    assert sshs_to_category(0, 45.0) == "Tropical Storm"
    assert sshs_to_category(1, 70.0) == "Category 1"
    assert sshs_to_category(2, 90.0) == "Category 2"
    assert sshs_to_category(3, 105.0) == "Category 3"
    assert sshs_to_category(4, 120.0) == "Category 4"
    assert sshs_to_category(5, 145.0) == "Category 5"
    # Fallback to wind speed when sshs is None
    assert sshs_to_category(None, 25.0) == "Tropical Depression"
    assert sshs_to_category(None, 45.0) == "Tropical Storm"
    assert sshs_to_category(None, 65.0) == "Category 1"
    assert sshs_to_category(None, 85.0) == "Category 2"
    assert sshs_to_category(None, 100.0) == "Category 3"
    assert sshs_to_category(None, 120.0) == "Category 4"
    assert sshs_to_category(None, 140.0) == "Category 5"
    assert sshs_to_category(None, None) == "Tropical Cyclone"


def test_checksum_computation_and_file_stats():
    """Ensure SHA-256 computation and file statistics are correctly gathered."""
    with tempfile.NamedTemporaryFile("w+", suffix=".csv", delete=False) as f:
        f.write(SAMPLE_IBTRACS_CSV)
        f.flush()
        temp_path = f.name

    try:
        client = IBTrACSClient()
        hazards, stats = client.load_file_with_stats(temp_path)
        assert len(hazards) == 1
        assert "file_sha256" in stats
        assert len(stats["file_sha256"]) == 64
        assert stats["total_rows_read"] == 6
        assert stats["valid_track_points"] == 3
    finally:
        Path(temp_path).unlink(missing_ok=True)
