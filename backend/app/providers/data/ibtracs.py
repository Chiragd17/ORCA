import csv
import hashlib
import io
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from app.core.logging import logger
from app.schemas.hazard import HazardRead, HazardTrackPoint


def compute_file_sha256(filepath: str | Path) -> str:
    """Compute SHA-256 checksum of a local file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def sshs_to_category(sshs_val: int | None, wind_knots: float | None) -> str:
    """Map Saffir-Simpson Hurricane Scale or wind speed in knots to standardized category."""
    if sshs_val is not None:
        if sshs_val <= -2:
            return "Tropical Disturbance"
        if sshs_val == -1:
            return "Tropical Depression"
        if sshs_val == 0:
            return "Tropical Storm"
        if sshs_val == 1:
            return "Category 1"
        if sshs_val == 2:
            return "Category 2"
        if sshs_val == 3:
            return "Category 3"
        if sshs_val == 4:
            return "Category 4"
        if sshs_val >= 5:
            return "Category 5"

    if wind_knots is not None:
        if wind_knots < 34:
            return "Tropical Depression"
        if wind_knots < 64:
            return "Tropical Storm"
        if wind_knots < 83:
            return "Category 1"
        if wind_knots < 96:
            return "Category 2"
        if wind_knots < 113:
            return "Category 3"
        if wind_knots < 137:
            return "Category 4"
        return "Category 5"

    return "Tropical Cyclone"


def _clean_numeric(raw: str | None) -> float | None:
    """Parse numeric measurement string, correctly preserving missing values without zero coercion."""
    if not raw:
        return None
    val_str = raw.strip()
    if val_str in ("", "-999", "-999.0", "-99", "NA", "N/A", "null"):
        return None
    try:
        val = float(val_str)
        return val if val > 0 else None
    except ValueError:
        return None


class IBTrACSClient:
    """
    Parser and client for NOAA International Best Track Archive for Climate Stewardship (IBTrACS).
    Provider: NOAA National Centers for Environmental Information (NCEI)
    Product: v04r01 North Indian Ocean (NI) Best Track Archive
    """

    NOAA_NI_CSV_URL: str = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv"

    def __init__(self, sample_filepath: str | None = None):
        self.sample_filepath = sample_filepath or os.path.join(
            "data", "processed", "ibtracs_arabian_sea_sample.csv"
        )

    def parse_csv_with_stats(
        self,
        csv_content: str,
        basin_filter: str | None = None,
        limit_storms: int | None = None,
    ) -> tuple[list[HazardRead], dict[str, Any]]:
        """
        Parses IBTrACS CSV data into chronologically sorted HazardRead models,
        tracking exhaustive validation and parse statistics.
        """
        stats: dict[str, Any] = {
            "total_rows_read": 0,
            "valid_track_points": 0,
            "total_storms": 0,
            "skipped_missing_sid": 0,
            "skipped_invalid_coords": 0,
            "skipped_out_of_range": 0,
            "skipped_invalid_timestamp": 0,
            "skipped_basin_filter": 0,
            "duplicate_timestamps": 0,
        }

        f = io.StringIO(csv_content)
        reader = csv.reader(f)

        header = next(reader, None)
        if not header:
            return [], stats

        # Skip units row if present (e.g. contains "Year" or "degrees_north")
        first_row = next(reader, None)
        if first_row and any(
            kw in "".join(first_row) for kw in ["Year", "degrees_north", "kts"]
        ):
            pass  # Successfully skipped metadata/units row
        elif first_row:
            # Re-wrap if first row was actually data
            f = io.StringIO(csv_content)
            reader = csv.reader(f)
            header = next(reader)

        col_map = {col.strip(): idx for idx, col in enumerate(header)}

        # Required columns check
        req_cols = ["SID", "NAME", "ISO_TIME", "LAT", "LON"]
        if not all(c in col_map for c in req_cols):
            logger.warning("IBTrACS CSV missing required columns.")
            return [], stats

        sid_idx = col_map["SID"]
        name_idx = col_map["NAME"]
        time_idx = col_map["ISO_TIME"]
        lat_idx = col_map["LAT"]
        lon_idx = col_map["LON"]
        subbasin_idx = col_map.get("SUBBASIN")
        wmo_wind_idx = col_map.get("WMO_WIND")
        wmo_pres_idx = col_map.get("WMO_PRES")
        usa_wind_idx = col_map.get("USA_WIND")
        usa_pres_idx = col_map.get("USA_PRES")
        sshs_idx = col_map.get("USA_SSHS")

        storms: dict[str, dict[str, Any]] = {}

        for row in reader:
            if not row or len(row) <= max(sid_idx, lat_idx, lon_idx, time_idx):
                continue

            stats["total_rows_read"] += 1

            sid = row[sid_idx].strip()
            if not sid:
                stats["skipped_missing_sid"] += 1
                continue

            # Subbasin handling (AS = Arabian Sea, BB = Bay of Bengal)
            subbasin_code = (
                row[subbasin_idx].strip().upper() if subbasin_idx is not None else ""
            )
            if subbasin_code == "AS":
                subbasin = "arabian_sea"
            elif subbasin_code == "BB":
                subbasin = "bay_of_bengal"
            elif subbasin_code:
                subbasin = f"subbasin_{subbasin_code.lower()}"
            else:
                subbasin = "north_indian_ocean"

            if basin_filter and subbasin.lower() != basin_filter.lower().strip():
                stats["skipped_basin_filter"] += 1
                continue

            # Parse and validate coordinates
            try:
                lat = float(row[lat_idx].strip())
                lon = float(row[lon_idx].strip())
            except ValueError:
                stats["skipped_invalid_coords"] += 1
                continue

            if not (-90.0 <= lat <= 90.0):
                stats["skipped_out_of_range"] += 1
                continue

            # Normalize longitude to [-180, 180] range if expressed in [0, 360]
            if lon > 180.0:
                lon = ((lon + 180.0) % 360.0) - 180.0
            elif lon < -180.0:
                lon = ((lon - 180.0) % 360.0) + 180.0

            # Parse observation timestamp (strictly UTC)
            time_str = row[time_idx].strip()
            try:
                obs_time = datetime.fromisoformat(time_str).replace(tzinfo=UTC)
            except ValueError:
                stats["skipped_invalid_timestamp"] += 1
                continue

            # Parse wind speed in knots (prefer WMO_WIND, fallback to USA_WIND)
            wmo_wind_str = row[wmo_wind_idx] if wmo_wind_idx is not None else None
            usa_wind_str = row[usa_wind_idx] if usa_wind_idx is not None else None
            wind_knots = _clean_numeric(wmo_wind_str)
            if wind_knots is None:
                wind_knots = _clean_numeric(usa_wind_str)

            # Parse pressure in hPa/mb (prefer WMO_PRES, fallback to USA_PRES)
            wmo_pres_str = row[wmo_pres_idx] if wmo_pres_idx is not None else None
            usa_pres_str = row[usa_pres_idx] if usa_pres_idx is not None else None
            pres_hpa = _clean_numeric(wmo_pres_str)
            if pres_hpa is None:
                pres_hpa = _clean_numeric(usa_pres_str)

            # Parse SSHS category
            sshs_val: int | None = None
            if sshs_idx is not None and row[sshs_idx].strip():
                try:
                    s_cand = int(row[sshs_idx].strip())
                    if s_cand >= -1:
                        sshs_val = s_cand
                except ValueError:
                    pass

            category = sshs_to_category(sshs_val, wind_knots)

            raw_name = row[name_idx].strip().title()
            if raw_name.upper() in ["NOT_NAMED", "UNNAMED", ""]:
                storm_name = f"Cyclone {sid}"
            else:
                storm_name = f"Cyclone {raw_name}"

            if sid not in storms:
                storms[sid] = {
                    "hazard_id": f"hz-ibtracs-{sid.lower()}",
                    "name": storm_name,
                    "type": "cyclone",
                    "source": "NOAA IBTrACS",
                    "basin": subbasin,
                    "status": "historical",
                    "track_points": {},
                }

            # Deduplicate by observation timestamp within the storm
            if obs_time in storms[sid]["track_points"]:
                stats["duplicate_timestamps"] += 1
            else:
                stats["valid_track_points"] += 1

            storms[sid]["track_points"][obs_time] = HazardTrackPoint(
                time=obs_time,
                latitude=round(lat, 4),
                longitude=round(lon, 4),
                wind_speed_knots=wind_knots,
                pressure_hpa=pres_hpa,
                category=category,
                is_forecast=False,
            )

        hazard_list: list[HazardRead] = []
        for sid, sdata in storms.items():
            sorted_points = [
                pt
                for _, pt in sorted(sdata["track_points"].items(), key=lambda x: x[0])
            ]
            if not sorted_points:
                continue

            first_obs = sorted_points[0].time
            last_obs = sorted_points[-1].time

            hazard_list.append(
                HazardRead(
                    hazard_id=sdata["hazard_id"],
                    name=sdata["name"],
                    type=sdata["type"],
                    source=sdata["source"],
                    basin=sdata["basin"],
                    status=sdata["status"],
                    first_observed=first_obs,
                    last_observed=last_obs,
                    track_points=sorted_points,
                )
            )

        # Sort hazards by latest observation descending
        hazard_list.sort(
            key=lambda h: h.last_observed or datetime.min.replace(tzinfo=UTC),
            reverse=True,
        )

        if limit_storms and limit_storms > 0:
            hazard_list = hazard_list[:limit_storms]

        stats["total_storms"] = len(hazard_list)
        return hazard_list, stats

    def parse_csv(
        self,
        csv_content: str,
        basin_filter: str | None = None,
        limit_storms: int | None = None,
    ) -> list[HazardRead]:
        """Backward-compatible parse method returning list[HazardRead]."""
        hazards, _ = self.parse_csv_with_stats(
            csv_content=csv_content,
            basin_filter=basin_filter,
            limit_storms=limit_storms,
        )
        return hazards

    def load_local_dataset(
        self,
        basin_filter: str | None = None,
        limit_storms: int | None = None,
    ) -> list[HazardRead]:
        """Loads and parses the regional or raw IBTrACS dataset from disk."""
        if not os.path.exists(self.sample_filepath):
            logger.warning(f"IBTrACS file not found at {self.sample_filepath}")
            return []

        with open(self.sample_filepath, encoding="utf-8") as f:
            content = f.read()
        return self.parse_csv(
            content, basin_filter=basin_filter, limit_storms=limit_storms
        )

    def load_file_with_stats(
        self,
        filepath: str | Path,
        basin_filter: str | None = None,
        limit_storms: int | None = None,
    ) -> tuple[list[HazardRead], dict[str, Any]]:
        """Loads and parses any local IBTrACS CSV file with complete statistics."""
        path = Path(filepath)
        if not path.exists():
            raise FileNotFoundError(f"IBTrACS file does not exist: {path}")

        checksum = compute_file_sha256(path)
        with open(path, encoding="utf-8") as f:
            content = f.read()

        hazards, stats = self.parse_csv_with_stats(
            content, basin_filter=basin_filter, limit_storms=limit_storms
        )
        stats["file_sha256"] = checksum
        stats["filepath"] = str(path.resolve())
        stats["file_size_bytes"] = path.stat().st_size
        return hazards, stats

    def download_official_dataset(
        self,
        dest_path: str | Path | None = None,
        timeout_seconds: int = 60,
        force_redownload: bool = False,
    ) -> tuple[Path, str]:
        """
        Downloads official NOAA IBTrACS NI CSV to local disk.
        Returns tuple of (destination_path, sha256_checksum).
        """
        target = (
            Path(dest_path)
            if dest_path
            else Path("data/raw/ibtracs.NI.list.v04r01.csv")
        )
        target.parent.mkdir(parents=True, exist_ok=True)

        if target.exists() and not force_redownload and target.stat().st_size > 1000000:
            logger.info(f"Using existing cached official IBTrACS dataset at {target}")
            return target, compute_file_sha256(target)

        logger.info(
            f"Downloading official NOAA IBTrACS dataset from {self.NOAA_NI_CSV_URL} to {target}"
        )
        with (
            httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client,
            client.stream("GET", self.NOAA_NI_CSV_URL) as response,
            open(target, "wb") as f,
        ):
            response.raise_for_status()
            f.writelines(response.iter_bytes(chunk_size=65536))

        checksum = compute_file_sha256(target)
        logger.info(f"Download complete: {target} (SHA256: {checksum})")
        return target, checksum

    async def fetch_noaa_basin(self) -> list[HazardRead]:
        """Fetches live IBTrACS North Indian Ocean basin CSV from NOAA NCEI."""
        logger.info(f"Fetching IBTrACS data from {self.NOAA_NI_CSV_URL}")
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(self.NOAA_NI_CSV_URL, follow_redirects=True)
            resp.raise_for_status()
            return self.parse_csv(resp.text)
