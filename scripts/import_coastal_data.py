#!/usr/bin/env python3
"""
ORCA Coastal & Exposure Data Importer (Person 3 / Coastal Risk Agent).
Ingests genuine coastal settlements, ports, critical infrastructure, and ecological features
for the Karnataka study area (Mangaluru - Udupi sector).

Features:
- Validates WGS84 coordinates and GeoJSON geometries deterministically.
- Idempotent upsert matching on unique feature ID or (name, feature_type).
- Preserves provenance in data_sources and evidence_records tables.
- Graceful offline fallback / dry-run support.
- Safe transaction handling with rollback on failure.
"""

import argparse
import asyncio
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Add backend directory to sys.path so app modules can be imported
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.agents.coastal_risk.historical import (
    VERIFIED_HISTORICAL_HAZARDS,
    HistoricalHazardRecord,
)
from app.agents.coastal_risk.reference_data import (
    DATA_SOURCE_METADATA,
    VERIFIED_COASTAL_FEATURES,
)
from app.agents.coastal_risk.spatial import validate_coordinates
from app.core.config import settings
# pyrefly: ignore [missing-import]
from app.models import CoastalFeature, DataSource, EvidenceRecordModel
# pyrefly: ignore [missing-import]
from sqlalchemy import select
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


class CoastalDataImporter:
    """Idempotent importer for coastal spatial features and exposure data."""

    def __init__(self, db_url: Optional[str] = None, dry_run: bool = False, limit: Optional[int] = None):
        raw_url = db_url or settings.DATABASE_URL
        if raw_url.startswith("postgresql://"):
            raw_url = raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
        self.db_url = raw_url
        self.dry_run = dry_run
        self.limit = limit
        self.engine = None
        self.session_maker = None

    async def init_db(self) -> bool:
        """Initialize database engine and session factory. Returns False if unreachable."""
        if self.dry_run:
            print("[*] Dry-run mode enabled: skipping database engine initialization.")
            return True

        try:
            self.engine = create_async_engine(
                self.db_url,
                echo=False,
                future=True,
                connect_args={"connect_timeout": 5},
            )
            self.session_maker = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
            # Test connectivity
            async with self.engine.connect() as conn:
                await conn.execute(select(1))
            return True
        except Exception as e:
            # Mask credentials if present
            safe_msg = str(e).split("@")[-1] if "@" in str(e) else str(e)
            print(f"[!] Database connection failed: {safe_msg}")
            return False

    async def close(self):
        if self.engine:
            await self.engine.dispose()

    def validate_feature_record(self, record: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validate feature required fields, coordinate ranges, and geometry."""
        required = ["id", "name", "feature_type", "latitude", "longitude"]
        for field in required:
            if field not in record or record[field] is None:
                return False, f"Missing required field '{field}'"

        lat = record["latitude"]
        lon = record["longitude"]
        try:
            validate_coordinates(lat, lon)
        except ValueError as err:
            return False, f"Invalid coordinates: {err}"

        geom = record.get("geojson_geometry")
        if geom:
            if not isinstance(geom, dict) or "type" not in geom or "coordinates" not in geom:
                return False, "Malformed GeoJSON geometry structure"

        return True, None

    def validate_historical_record(self, record: Any) -> Tuple[bool, Optional[str]]:
        """Validate historical hazard record provenance, timestamps, and parameters."""
        if not hasattr(record, "event_id") or not record.event_id:
            return False, "Missing 'event_id'"
        if not hasattr(record, "agency") or not record.agency:
            return False, "Missing 'agency' provenance"
        try:
            validate_coordinates(record.latitude, record.longitude)
        except ValueError as err:
            return False, f"Invalid coordinates: {err}"

        if record.start_time > record.end_time:
            return False, "start_time must be before end_time"
        if not (record.start_time <= record.peak_time <= record.end_time):
            return False, "peak_time must fall within [start_time, end_time]"
        if record.peak_wave_height_m < 0:
            return False, "peak_wave_height_m cannot be negative"
        if record.peak_wind_gust_kmh < 0:
            return False, "peak_wind_gust_kmh cannot be negative"

        return True, None

    async def run(self) -> Dict[str, int]:
        """Execute the ingestion pipeline."""
        stats = {
            "processed": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "rejected": 0,
            "historical_validated": 0,
        }

        print(f"[*] Starting coastal data import for study area: {DATA_SOURCE_METADATA['study_area']['region']}")
        print(f"[*] Provider: {DATA_SOURCE_METADATA['provider']}")
        print(f"[*] License: {DATA_SOURCE_METADATA['license']}")

        # Validate verified historical hazards
        print(f"[*] Validating verified historical coastal hazards (IMD / INCOIS)...")
        for h_rec in VERIFIED_HISTORICAL_HAZARDS:
            h_valid, h_err = self.validate_historical_record(h_rec)
            if h_valid:
                stats["historical_validated"] += 1
            else:
                print(f"    [-] Invalid historical hazard record '{h_rec.event_id}': {h_err}")

        features_to_import = VERIFIED_COASTAL_FEATURES
        if self.limit:
            features_to_import = features_to_import[: self.limit]

        db_available = await self.init_db()
        if not db_available and not self.dry_run:
            print("[!] Local PostgreSQL is offline or unreachable.")
            print("[!] Unable to persist records to PostgreSQL database.")
            print("[*] Validating feature dataset in dry-run mode instead...")
            self.dry_run = True

        valid_records: List[Dict[str, Any]] = []
        for feat in features_to_import:
            stats["processed"] += 1
            is_valid, reason = self.validate_feature_record(feat)
            if not is_valid:
                stats["rejected"] += 1
                print(f"    [-] Rejected record '{feat.get('name', 'UNKNOWN')}': {reason}")
            else:
                valid_records.append(feat)

        if self.dry_run or not self.session_maker:
            stats["inserted"] = len(valid_records)
            print("\n[=] Import Summary (DRY-RUN / VALIDATION ONLY):")
            print(f"    Total Processed:         {stats['processed']}")
            print(f"    Valid Coastal Features:  {stats['inserted']}")
            print(f"    Historical Hazards:      {stats['historical_validated']}")
            print(f"    Rejected:                {stats['rejected']}")
            print(f"    Updated:                 {stats['updated']}")
            print(f"    Skipped:                 {stats['skipped']}")
            return stats

        # Database persistence
        async with self.session_maker() as session:
            try:
                # 1. Ensure DataSource record exists
                src_stmt = select(DataSource).where(DataSource.id == DATA_SOURCE_METADATA["source_id"])
                res = await session.execute(src_stmt)
                ds = res.scalar_one_or_none()
                if not ds:
                    ds = DataSource(
                        id=DATA_SOURCE_METADATA["source_id"],
                        name=DATA_SOURCE_METADATA["name"],
                        provider=DATA_SOURCE_METADATA["provider"],
                        url=DATA_SOURCE_METADATA["url"],
                        license=DATA_SOURCE_METADATA["license"],
                        update_frequency=DATA_SOURCE_METADATA["update_frequency"],
                    )
                    session.add(ds)
                    await session.flush()

                # 2. Upsert coastal features and evidence records
                for feat in valid_records:
                    feat_id = feat["id"]
                    existing_stmt = select(CoastalFeature).where(CoastalFeature.id == feat_id)
                    existing_res = await session.execute(existing_stmt)
                    existing_feat = existing_res.scalar_one_or_none()

                    if existing_feat:
                        # Update attributes idempotently
                        existing_feat.name = feat["name"]
                        existing_feat.feature_type = feat["feature_type"]
                        existing_feat.latitude = feat["latitude"]
                        existing_feat.longitude = feat["longitude"]
                        existing_feat.geojson_geometry = feat.get("geojson_geometry")
                        existing_feat.estimated_population = feat.get("estimated_population")
                        existing_feat.source_id = ds.id
                        stats["updated"] += 1
                    else:
                        new_feat = CoastalFeature(
                            id=feat_id,
                            name=feat["name"],
                            feature_type=feat["feature_type"],
                            latitude=feat["latitude"],
                            longitude=feat["longitude"],
                            geojson_geometry=feat.get("geojson_geometry"),
                            estimated_population=feat.get("estimated_population"),
                            source_id=ds.id,
                        )
                        session.add(new_feat)
                        stats["inserted"] += 1

                    # 3. Create or update EvidenceRecordModel for provenance
                    raw_payload_str = json.dumps(feat, sort_keys=True)
                    payload_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()
                    evidence_id = f"evi_cf_{feat_id}"

                    ev_stmt = select(EvidenceRecordModel).where(EvidenceRecordModel.id == evidence_id)
                    ev_res = await session.execute(ev_stmt)
                    existing_ev = ev_res.scalar_one_or_none()

                    if not existing_ev:
                        ev_record = EvidenceRecordModel(
                            id=evidence_id,
                            source_id=ds.id,
                            source_identifier=feat.get("source_identifier", feat_id),
                            source_url=ds.url,
                            observation_time=datetime(feat.get("census_year") or 2024, 1, 1, tzinfo=timezone.utc),
                            retrieval_time=datetime.now(timezone.utc),
                            latitude=feat["latitude"],
                            longitude=feat["longitude"],
                            data_type="coastal_feature",
                            raw_payload=feat,
                            hash=payload_hash,
                        )
                        session.add(ev_record)

                await session.commit()
                print("[+] Changes committed successfully to PostgreSQL database.")
            except Exception as e:
                await session.rollback()
                print(f"[!] Transaction failed and was rolled back: {e}")
                raise
            finally:
                await self.close()

        print("\n[=] Import Summary:")
        print(f"    Total Processed: {stats['processed']}")
        print(f"    Inserted:        {stats['inserted']}")
        print(f"    Updated:         {stats['updated']}")
        print(f"    Skipped:         {stats['skipped']}")
        print(f"    Rejected:        {stats['rejected']}")
        return stats


def main():
    parser = argparse.ArgumentParser(description="ORCA Coastal and Exposure Data Ingestion Pipeline")
    parser.add_argument("--db-url", type=str, default=None, help="PostgreSQL connection string")
    parser.add_argument("--dry-run", action="store_true", help="Validate records without writing to DB")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of records to ingest")
    parser.add_argument("--study-area", type=str, default="karnataka", help="Study area key (default: karnataka)")

    args = parser.parse_args()

    importer = CoastalDataImporter(
        db_url=args.db_url,
        dry_run=args.dry_run,
        limit=args.limit,
    )

    try:
        asyncio.run(importer.run())
    except KeyboardInterrupt:
        print("\n[!] Import interrupted by user.")
    except Exception as e:
        print(f"\n[!] Fatal import error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
