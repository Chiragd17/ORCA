import math
from collections.abc import Sequence

from app.schemas.hazard import HazardTrackPoint


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees) using the Haversine formula.
    """
    # Convert decimal degrees to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Earth radius in kilometers
    r = 6371.0

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return round(r * c, 2)


def find_closest_track_point(
    target_lat: float,
    target_lon: float,
    track_points: Sequence[HazardTrackPoint],
) -> tuple[HazardTrackPoint | None, float]:
    """
    Find the track point closest to the specified target coordinates.
    Returns (closest_track_point, distance_in_km).
    """
    if not track_points:
        return None, float("inf")

    min_dist = float("inf")
    closest_point: HazardTrackPoint | None = None

    for pt in track_points:
        dist = haversine_distance_km(target_lat, target_lon, pt.latitude, pt.longitude)
        if dist < min_dist:
            min_dist = dist
            closest_point = pt

    return closest_point, min_dist
