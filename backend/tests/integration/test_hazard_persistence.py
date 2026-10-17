from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.repositories.hazard_repo import HazardRepository
from app.db.hazard_session import hazard_engine as engine
from app.models.hazard import Hazard, HazardTrack
from app.providers.data.ibtracs import IBTrACSClient
from app.schemas.hazard import HazardRead, HazardTrackPoint


@pytest.fixture
def db_session():
    """
    Connect to PostgreSQL (orca_db) and wrap each test in a transaction that is rolled back.
    Uses join_transaction_mode='create_savepoint' so nested commits in the code under test
    operate on savepoints, while the outer transaction rolls back all changes, leaving orca_db clean.
    """
    connection = engine.connect()
    trans = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


def make_sample_hazard(hazard_id="hz-test-tauktae", name="Cyclone Tauktae"):
    return HazardRead(
        hazard_id=hazard_id,
        name=name,
        type="cyclone",
        source="NOAA IBTrACS",
        basin="arabian_sea",
        status="historical",
        first_observed=datetime(2021, 5, 14, 6, 0, tzinfo=UTC),
        last_observed=datetime(2021, 5, 15, 6, 0, tzinfo=UTC),
        track_points=[
            HazardTrackPoint(
                time=datetime(2021, 5, 14, 6, 0, tzinfo=UTC),
                latitude=11.2,
                longitude=72.2,
                wind_speed_knots=35.0,
                pressure_hpa=998.0,
                category="Tropical Storm",
                is_forecast=False,
            ),
            HazardTrackPoint(
                time=datetime(2021, 5, 15, 6, 0, tzinfo=UTC),
                latitude=13.3,
                longitude=73.0,
                wind_speed_knots=65.0,
                pressure_hpa=980.0,
                category="Category 1",
                is_forecast=False,
            ),
        ],
    )


def test_first_import_creates_correct_records(db_session):
    """Test 1: First import creates correct Hazard and HazardTrack records in PostgreSQL."""
    repo = HazardRepository(db_session)
    hazard_in = make_sample_hazard()

    _saved, stats = repo.upsert_hazard(hazard_in, commit=True)
    assert stats["event_inserted"] == 1
    assert stats["points_inserted"] == 2

    persisted = db_session.get(Hazard, hazard_in.hazard_id)
    assert persisted is not None
    assert persisted.name == "Cyclone Tauktae"
    assert persisted.hazard_type == "cyclone"
    assert persisted.source == "NOAA IBTrACS"
    assert persisted.basin == "arabian_sea"
    assert len(persisted.track_points) == 2

    # Check track point details
    pts = sorted(persisted.track_points, key=lambda p: p.time)
    assert pts[0].latitude == 11.2
    assert pts[0].wind_speed_knots == 35.0
    assert pts[0].pressure_hpa == 998.0
    assert pts[0].is_forecast is False


def test_repeat_import_idempotency_zero_duplicates(db_session):
    """Test 2: Re-importing identical data creates 0 duplicates and leaves counts unchanged."""
    repo = HazardRepository(db_session)
    hazard_in = make_sample_hazard()

    # Pass 1
    _, stats1 = repo.upsert_hazard(hazard_in, commit=True)
    assert stats1["event_inserted"] == 1
    assert stats1["points_inserted"] == 2

    # Pass 2: Identical data
    _, stats2 = repo.upsert_hazard(hazard_in, commit=True)
    assert stats2["event_inserted"] == 0
    assert stats2["event_updated"] == 0
    assert stats2["event_unchanged"] == 1
    assert stats2["points_inserted"] == 0
    assert stats2["points_updated"] == 0
    assert stats2["points_unchanged"] == 2

    # Verify database counts
    tracks = (
        db_session.query(HazardTrack)
        .filter(HazardTrack.hazard_id == hazard_in.hazard_id)
        .all()
    )
    assert len(tracks) == 2


def test_import_modified_record_updates_in_place(db_session):
    """Test 3: Import of modified record updates existing rows rather than duplicating."""
    repo = HazardRepository(db_session)
    hazard_in = make_sample_hazard()

    # Pass 1
    repo.upsert_hazard(hazard_in, commit=True)

    # Modify storm name and 1 track point wind speed
    modified_hazard = make_sample_hazard(name="Cyclone Tauktae Superstorm")
    modified_hazard.track_points[0].wind_speed_knots = 45.0

    _, stats = repo.upsert_hazard(modified_hazard, commit=True)
    assert stats["event_inserted"] == 0
    assert stats["event_updated"] == 1
    assert stats["points_inserted"] == 0
    assert stats["points_updated"] == 1
    assert stats["points_unchanged"] == 1

    # Verify updated values in PostgreSQL
    persisted = db_session.get(Hazard, hazard_in.hazard_id)
    assert persisted.name == "Cyclone Tauktae Superstorm"
    pts = sorted(persisted.track_points, key=lambda p: p.time)
    assert pts[0].wind_speed_knots == 45.0
    assert len(pts) == 2


def test_stable_deterministic_track_ids(db_session):
    """Test 4: Stable deterministic track IDs prevent order-dependent duplicates."""
    repo = HazardRepository(db_session)
    hazard_in = make_sample_hazard()

    # Expected deterministic IDs
    expected_ids = {
        f"{hazard_in.hazard_id}-{int(pt.time.timestamp())}"
        for pt in hazard_in.track_points
    }

    saved, _ = repo.upsert_hazard(hazard_in, commit=True)
    actual_ids = {pt.id for pt in saved.track_points}
    assert actual_ids == expected_ids

    # Re-insert with reversed track points list
    reversed_hazard = make_sample_hazard()
    reversed_hazard.track_points.reverse()
    saved2, stats = repo.upsert_hazard(reversed_hazard, commit=True)
    assert stats["points_inserted"] == 0
    assert stats["points_unchanged"] == 2
    assert {pt.id for pt in saved2.track_points} == expected_ids


def test_dry_run_produces_zero_writes(db_session):
    """Test 5: Dry-run mode produces zero database writes."""
    repo = HazardRepository(db_session)
    hazard_in = make_sample_hazard(hazard_id="hz-dry-run-test")

    _, stats = repo.upsert_hazard(hazard_in, dry_run=True, commit=False)
    assert stats["event_inserted"] == 1
    assert stats["points_inserted"] == 2

    # Verify nothing was persisted
    persisted = db_session.get(Hazard, "hz-dry-run-test")
    assert persisted is None


def test_transaction_rollback_on_batch_failure(db_session):
    """Test 6: Failed batch rolls back cleanly without leaving partial records."""
    repo = HazardRepository(db_session)

    valid_hazard = make_sample_hazard(hazard_id="hz-batch-valid")

    # Invalid hazard with None latitude inside a track point (violates NOT NULL in DB)
    invalid_hazard = make_sample_hazard(hazard_id="hz-batch-invalid")
    invalid_hazard.track_points[0].latitude = None  # Will fail NOT NULL constraint

    with pytest.raises(SQLAlchemyError):
        repo.upsert_hazards_batch(
            hazards=[valid_hazard, invalid_hazard],
            batch_size=10,
            dry_run=False,
        )

    # Verify valid hazard was also rolled back
    assert db_session.get(Hazard, "hz-batch-valid") is None
    assert db_session.get(Hazard, "hz-batch-invalid") is None


def test_batch_upsert_fresh_and_repeat_idempotency(db_session):
    """Test 7: Ingesting a batch twice produces fresh inserts on Pass 1 and 100% unchanged on Pass 2."""
    h1 = make_sample_hazard(hazard_id="hz-batch-test-1", name="Batch Cyclone 1")
    h2 = make_sample_hazard(hazard_id="hz-batch-test-2", name="Batch Cyclone 2")

    repo = HazardRepository(db_session)

    # Pass 1: Fresh batch
    res1 = repo.upsert_hazards_batch([h1, h2], batch_size=1, dry_run=False)
    assert res1["events_inserted"] == 2
    assert res1["points_inserted"] == 4

    # Pass 2: Identical batch
    res2 = repo.upsert_hazards_batch([h1, h2], batch_size=1, dry_run=False)
    assert res2["events_inserted"] == 0
    assert res2["events_unchanged"] == 2
    assert res2["points_inserted"] == 0
    assert res2["points_unchanged"] == 4


def test_sample_dataset_against_populated_db(db_session):
    """Test 8: Re-ingesting the sample dataset into populated orca_db produces 0 new records."""
    sample_csv = (
        Path(__file__).resolve().parents[3]
        / "data"
        / "processed"
        / "ibtracs_arabian_sea_sample.csv"
    )
    assert sample_csv.exists(), f"Sample CSV {sample_csv} must exist"

    client = IBTrACSClient(sample_filepath=str(sample_csv))
    hazards = client.load_local_dataset()
    assert len(hazards) >= 1

    repo = HazardRepository(db_session)
    res1 = repo.upsert_hazards_batch(hazards, batch_size=10, dry_run=False)
    assert res1["events_inserted"] == 0
    assert res1["points_inserted"] == 0
    assert res1["points_unchanged"] == 49

    # Second pass of sample dataset produces 100% unchanged
    res2 = repo.upsert_hazards_batch(hazards, batch_size=10, dry_run=False)
    assert res2["events_inserted"] == 0
    assert res2["events_unchanged"] == 1
    assert res2["points_inserted"] == 0
    assert res2["points_unchanged"] == 49
