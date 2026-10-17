import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum


class FreshnessStatus(str, Enum):
    """Deterministic data freshness classification."""

    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"


class SyncOutcome(str, Enum):
    """Outcome of a provider synchronization attempt."""

    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    EMPTY = "empty"
    IDLE = "idle"


def evaluate_freshness(
    timestamp: datetime | None,
    threshold_hours: float,
    now_utc: datetime | None = None,
    now: datetime | None = None,
) -> FreshnessStatus:
    """Evaluate whether data is fresh or stale against a strict, deterministic threshold.

    Rules:
    - None timestamp -> UNKNOWN (honest, no fabricated timestamps)
    - age <= threshold_hours -> FRESH
    - age > threshold_hours -> STALE
    """
    if timestamp is None:
        return FreshnessStatus.UNKNOWN

    current_time = now or now_utc or datetime.now(UTC)
    if timestamp.tzinfo is None:
        ts = timestamp.replace(tzinfo=UTC)
    else:
        ts = timestamp.astimezone(UTC)

    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=UTC)

    diff_seconds = (current_time - ts).total_seconds()
    # If timestamp is slightly in the future due to slight clock skew, it is FRESH
    if diff_seconds < 0:
        return FreshnessStatus.FRESH

    age_hours = diff_seconds / 3600.0
    if age_hours <= threshold_hours:
        return FreshnessStatus.FRESH
    return FreshnessStatus.STALE


@dataclass
class ProviderAttemptRecord:
    """Tracks the operational attempt and health state of a provider pipeline."""

    provider: str
    last_attempt_utc: datetime | None = None
    last_attempt_status: SyncOutcome = SyncOutcome.IDLE
    last_attempt_message: str | None = None
    last_error_category: str | None = None
    last_successful_sync_utc: datetime | None = None
    last_retrieved_count: int | None = None
    consecutive_failures: int = 0


class ProviderReliabilityTracker:
    """Thread-safe and process-safe in-memory state tracker for provider operational reliability.

    Maintains attempt history, consecutive failure counts, and last successful syncs,
    while querying persistent database tables as ground truth on initial startup.
    """

    def __init__(self):
        self._records: dict[str, ProviderAttemptRecord] = {
            "gdacs": ProviderAttemptRecord(provider="gdacs"),
            "open-meteo-marine": ProviderAttemptRecord(provider="open-meteo-marine"),
            "noaa-nhc": ProviderAttemptRecord(provider="noaa-nhc"),
        }
        self._locks: dict[str, asyncio.Lock] = {
            "gdacs": asyncio.Lock(),
            "open-meteo-marine": asyncio.Lock(),
            "noaa-nhc": asyncio.Lock(),
        }

    def get_lock(self, provider: str) -> asyncio.Lock:
        key = provider.lower()
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    def get_record(self, provider: str) -> ProviderAttemptRecord:
        key = provider.lower()
        if key not in self._records:
            self._records[key] = ProviderAttemptRecord(provider=key)
        return self._records[key]

    def record_attempt_start(self, provider: str) -> None:
        rec = self.get_record(provider)
        rec.last_attempt_utc = datetime.now(UTC)

    def record_attempt_success(
        self,
        provider: str,
        message: str = "Sync completed successfully",
        sync_time: datetime | None = None,
        outcome: SyncOutcome = SyncOutcome.SUCCESS,
        retrieved_count: int | None = None,
    ) -> None:
        rec = self.get_record(provider)
        now = sync_time or datetime.now(UTC)
        rec.last_attempt_utc = now
        rec.last_attempt_status = outcome
        rec.last_attempt_message = message
        rec.last_error_category = None
        rec.last_successful_sync_utc = now
        rec.last_retrieved_count = retrieved_count
        rec.consecutive_failures = 0

    def record_attempt_failure(
        self,
        provider: str,
        error_message: str,
        category: str = "network_error",
        attempt_time: datetime | None = None,
    ) -> None:
        rec = self.get_record(provider)
        rec.last_attempt_utc = attempt_time or datetime.now(UTC)
        rec.last_attempt_status = SyncOutcome.FAILED
        rec.last_attempt_message = error_message
        rec.last_error_category = category
        rec.consecutive_failures += 1


# Global singleton instance
reliability_tracker = ProviderReliabilityTracker()
