"""
Deterministic pure-Python spatial analysis utilities for the Coastal Risk Agent.
Provides geodesic distance (Haversine), Ray-Casting point-in-polygon,
and bounding-box operations strictly on WGS84 (EPSG:4326) coordinates.

No external GIS C-library dependencies required (zero compilation issues on Windows).
"""

import math
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

# Earth mean radius in kilometers (IUGG recommended value)
EARTH_RADIUS_KM = 6371.0088


def haversine_distance_km(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the geodesic distance between two points on Earth using the Haversine formula.
    Inputs:
        lat1, lon1: WGS84 coordinates of point 1 in decimal degrees.
        lat2, lon2: WGS84 coordinates of point 2 in decimal degrees.
    Returns:
        Distance in kilometers (km).
    """
    validate_coordinates(lat1, lon1)
    validate_coordinates(lat2, lon2)

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clip 'a' to [0, 1] to prevent floating point domain errors in sqrt
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return EARTH_RADIUS_KM * c


def validate_coordinates(lat: float, lon: float) -> None:
    """
    Validate that latitude and longitude are finite numbers within standard WGS84 ranges.
    Raises ValueError on invalid coordinates.
    """
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        raise ValueError(f"Coordinates must be numeric, got lat={type(lat)}, lon={type(lon)}")

    if math.isnan(lat) or math.isinf(lat) or math.isnan(lon) or math.isinf(lon):
        raise ValueError(f"Non-finite coordinates provided: lat={lat}, lon={lon}")

    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude must be between -90 and 90 degrees, got {lat}")

    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude must be between -180 and 180 degrees, got {lon}")


def parse_hazard_bbox(
    bbox: Sequence[float],
) -> Tuple[float, float, float, float]:
    """
    Parse and validate hazard bounding box.
    Per ORCA contract (docs/agent-contract.md):
        hazard_bbox is latitude-first: [min_lat, min_lon, max_lat, max_lon]
    Returns normalized tuple: (min_lon, min_lat, max_lon, max_lat) in WGS84.
    """
    if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
        raise ValueError(
            f"hazard_bbox must be a list/tuple of 4 floats [min_lat, min_lon, max_lat, max_lon], got {bbox}"
        )

    min_lat, min_lon, max_lat, max_lon = [float(v) for v in bbox]

    validate_coordinates(min_lat, min_lon)
    validate_coordinates(max_lat, max_lon)

    if min_lat > max_lat:
        raise ValueError(f"Invalid bbox: min_lat ({min_lat}) > max_lat ({max_lat})")
    if min_lon > max_lon:
        raise ValueError(f"Invalid bbox: min_lon ({min_lon}) > max_lon ({max_lon})")

    return (min_lon, min_lat, max_lon, max_lat)


def point_in_bbox(
    lat: float, lon: float, min_lon: float, min_lat: float, max_lon: float, max_lat: float
) -> bool:
    """Check if point (lat, lon) is within the bounding box."""
    return min_lat <= lat <= max_lat and min_lon <= lon <= max_lon


def point_in_ring(px: float, py: float, ring: Sequence[Sequence[float]]) -> bool:
    """
    Ray-casting algorithm (Even-Odd rule) for point-in-polygon.
    px: longitude (x)
    py: latitude (y)
    ring: sequence of [lon, lat] vertices.
    """
    n = len(ring)
    if n < 3:
        return False

    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]

        # Check ray intersection
        intersects = ((yi > py) != (yj > py)) and (
            px < (xj - xi) * (py - yi) / (yj - yi + 1e-15) + xi
        )
        if intersects:
            inside = not inside
        j = i

    return inside


def point_in_polygon(lat: float, lon: float, polygon_coords: List[List[List[float]]]) -> bool:
    """
    Check if a point (lat, lon) is inside a GeoJSON Polygon coordinates structure.
    GeoJSON Polygon coordinates: [ [exterior_ring], [interior_hole1], ... ]
    Each ring is a list of [lon, lat] pairs.
    """
    if not polygon_coords or not isinstance(polygon_coords, list):
        return False

    exterior_ring = polygon_coords[0]
    if not point_in_ring(lon, lat, exterior_ring):
        return False

    # If inside exterior ring, verify it is NOT inside any interior holes
    for hole in polygon_coords[1:]:
        if point_in_ring(lon, lat, hole):
            return False

    return True


def point_in_geojson_geometry(lat: float, lon: float, geometry: Dict[str, Any]) -> bool:
    """
    Check if point (lat, lon) intersects a GeoJSON geometry (Polygon or MultiPolygon).
    """
    validate_coordinates(lat, lon)

    if not isinstance(geometry, dict):
        raise ValueError("Geometry must be a dictionary")

    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")

    if not geom_type or coords is None:
        raise ValueError("Geometry missing 'type' or 'coordinates'")

    if geom_type == "Polygon":
        return point_in_polygon(lat, lon, coords)
    elif geom_type == "MultiPolygon":
        for poly_coords in coords:
            if point_in_polygon(lat, lon, poly_coords):
                return True
        return False
    elif geom_type == "Point":
        pt_lon, pt_lat = coords[0], coords[1]
        return abs(lat - pt_lat) < 1e-6 and abs(lon - pt_lon) < 1e-6
    else:
        raise ValueError(f"Unsupported geometry type for intersection check: {geom_type}")


def polygon_centroid(polygon_coords: List[List[List[float]]]) -> Tuple[float, float]:
    """
    Compute centroid (lat, lon) of a GeoJSON Polygon exterior ring.
    Returns: (centroid_lat, centroid_lon)
    """
    if not polygon_coords or len(polygon_coords[0]) == 0:
        raise ValueError("Cannot calculate centroid of empty polygon")

    ring = polygon_coords[0]
    # Remove closing duplicate if present
    pts = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring

    avg_lon = sum(p[0] for p in pts) / len(pts)
    avg_lat = sum(p[1] for p in pts) / len(pts)
    return (avg_lat, avg_lon)


def geometry_centroid(geometry: Dict[str, Any]) -> Tuple[float, float]:
    """
    Compute representative centroid (lat, lon) for GeoJSON Polygon or MultiPolygon.
    """
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")

    if geom_type == "Polygon":
        return polygon_centroid(coords)
    elif geom_type == "MultiPolygon":
        if not coords:
            raise ValueError("Empty MultiPolygon coordinates")
        return polygon_centroid(coords[0])
    elif geom_type == "Point":
        return (coords[1], coords[0])
    else:
        raise ValueError(f"Cannot compute centroid for geometry type {geom_type}")
