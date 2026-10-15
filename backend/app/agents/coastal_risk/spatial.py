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


def _cross_product(a: Sequence[float], b: Sequence[float], c: Sequence[float]) -> float:
    """2D cross product of vectors (b - a) and (c - a)."""
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def segments_intersect(
    p1: Sequence[float], p2: Sequence[float], p3: Sequence[float], p4: Sequence[float]
) -> bool:
    """
    Determine if 2D line segment p1-p2 intersects line segment p3-p4.
    Points are [lon, lat] pairs.
    """
    d1 = _cross_product(p3, p4, p1)
    d2 = _cross_product(p3, p4, p2)
    d3 = _cross_product(p1, p2, p3)
    d4 = _cross_product(p1, p2, p4)

    # General straddling condition
    if ((d1 > 1e-12 and d2 < -1e-12) or (d1 < -1e-12 and d2 > 1e-12)) and (
        (d3 > 1e-12 and d4 < -1e-12) or (d3 < -1e-12 and d4 > 1e-12)
    ):
        return True

    # Boundary and collinear on-segment condition
    def on_segment(p, a, b):
        return (
            min(a[0], b[0]) - 1e-12 <= p[0] <= max(a[0], b[0]) + 1e-12
            and min(a[1], b[1]) - 1e-12 <= p[1] <= max(a[1], b[1]) + 1e-12
        )

    if abs(d1) <= 1e-12 and on_segment(p1, p3, p4):
        return True
    if abs(d2) <= 1e-12 and on_segment(p2, p3, p4):
        return True
    if abs(d3) <= 1e-12 and on_segment(p3, p1, p2):
        return True
    if abs(d4) <= 1e-12 and on_segment(p4, p1, p2):
        return True

    return False


def rings_edges_cross(
    ring1: Sequence[Sequence[float]], ring2: Sequence[Sequence[float]]
) -> bool:
    """Check if any edge of ring1 intersects any edge of ring2."""
    n1 = len(ring1)
    n2 = len(ring2)
    for i in range(n1 - 1):
        for j in range(n2 - 1):
            if segments_intersect(ring1[i], ring1[i + 1], ring2[j], ring2[j + 1]):
                return True
    return False


def polygons_intersect(
    poly1_coords: List[List[List[float]]], poly2_coords: List[List[List[float]]]
) -> bool:
    """
    Deterministic 2D intersection of two GeoJSON Polygons.
    Supports:
    - Full containment (poly1 inside poly2 or poly2 inside poly1)
    - Partial overlap with intersecting boundaries
    - Interior holes (returns False if one polygon is strictly contained inside a hole of the other)
    """
    if not poly1_coords or not poly2_coords:
        return False

    ext1 = poly1_coords[0]
    ext2 = poly2_coords[0]

    # 1. Do boundary edges cross?
    if rings_edges_cross(ext1, ext2):
        return True

    # 2. Is any vertex of poly1 strictly inside poly2?
    for pt in ext1:
        if point_in_polygon(pt[1], pt[0], poly2_coords):
            return True

    # 3. Is any vertex of poly2 strictly inside poly1?
    for pt in ext2:
        if point_in_polygon(pt[1], pt[0], poly1_coords):
            return True

    return False


def geojson_geometries_intersect(geom1: Dict[str, Any], geom2: Dict[str, Any]) -> bool:
    """
    Determine if two GeoJSON geometries intersect.
    Supports Point, Polygon, and MultiPolygon combinations.
    """
    if not isinstance(geom1, dict) or not isinstance(geom2, dict):
        raise ValueError("Both geometries must be GeoJSON dictionaries")

    type1 = geom1.get("type")
    type2 = geom2.get("type")
    coords1 = geom1.get("coordinates")
    coords2 = geom2.get("coordinates")

    if not type1 or not type2 or coords1 is None or coords2 is None:
        raise ValueError("Invalid GeoJSON: missing 'type' or 'coordinates'")

    # Point vs Point
    if type1 == "Point" and type2 == "Point":
        return abs(coords1[0] - coords2[0]) < 1e-6 and abs(coords1[1] - coords2[1]) < 1e-6

    # Point vs Polygon
    if type1 == "Point" and type2 == "Polygon":
        return point_in_polygon(coords1[1], coords1[0], coords2)

    if type1 == "Polygon" and type2 == "Point":
        return point_in_polygon(coords2[1], coords2[0], coords1)

    # Point vs MultiPolygon
    if type1 == "Point" and type2 == "MultiPolygon":
        return any(point_in_polygon(coords1[1], coords1[0], poly) for poly in coords2)

    if type1 == "MultiPolygon" and type2 == "Point":
        return any(point_in_polygon(coords2[1], coords2[0], poly) for poly in coords1)

    # Polygon vs Polygon
    if type1 == "Polygon" and type2 == "Polygon":
        return polygons_intersect(coords1, coords2)

    # MultiPolygon vs Polygon
    if type1 == "MultiPolygon" and type2 == "Polygon":
        return any(polygons_intersect(poly, coords2) for poly in coords1)

    if type1 == "Polygon" and type2 == "MultiPolygon":
        return any(polygons_intersect(coords1, poly) for poly in coords2)

    # MultiPolygon vs MultiPolygon
    if type1 == "MultiPolygon" and type2 == "MultiPolygon":
        for poly1 in coords1:
            for poly2 in coords2:
                if polygons_intersect(poly1, poly2):
                    return True
        return False

    raise ValueError(f"Unsupported geometry intersection combination: {type1} and {type2}")

