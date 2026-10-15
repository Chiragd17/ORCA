# ORCA Shared Database Schema Specification

PostgreSQL is the single source of truth for the entire application. All models must adhere to:
- **Timestamps**: Explicit UTC timestamps (`DateTime(timezone=True)`).
- **Coordinates**: Standard WGS84 coordinates (`latitude` float between -90 and 90, `longitude` float between -180 and 180).
- **Idempotency**: External ingestion records must have unique source keys to allow safe re-runs.

---

## 1. Core Tables

### `data_sources`
Tracks origin datasets, licensing, and provider URLs.
- `id` (UUID / String, PK)
- `name` (String, unique): e.g. "open_meteo_marine", "noaa_ibtracs"
- `provider` (String): e.g. "Open-Meteo", "NOAA"
- `url` (String)
- `license` (String)
- `update_frequency` (String)
- `created_at` (DateTime, UTC)

### `marine_observations`
Stores physical and biochemical marine point/grid readings.
- `id` (UUID / String, PK)
- `source_id` (FK -> `data_sources.id`)
- `latitude` (Float)
- `longitude` (Float)
- `observation_time` (DateTime, UTC)
- `retrieval_time` (DateTime, UTC)
- `variable` (String): `sst`, `wave_height`, `wave_period`, `wind_speed`, `chlorophyll`
- `value` (Float)
- `unit` (String): `°C`, `m`, `s`, `m/s`, `mg/m³`
- `quality_flag` (String, nullable)
- `is_forecast` (Boolean, default False)

### `hazard_events`
Tracks tropical cyclones, tsunamis, storm surges, and flood alerts.
- `id` (UUID / String, PK)
- `source_id` (FK -> `data_sources.id`)
- `external_id` (String, unique within source): e.g. IBTrACS cyclone ID
- `name` (String)
- `hazard_type` (String): `cyclone`, `tsunami`, `surge`, `flood`
- `basin` (String, nullable): e.g. "North Indian"
- `status` (String): `active`, `historical`, `dissipated`
- `started_at` (DateTime, UTC, nullable)
- `ended_at` (DateTime, UTC, nullable)

### `hazard_tracks`
Waypoints along a hazard event's path.
- `id` (UUID / String, PK)
- `hazard_event_id` (FK -> `hazard_events.id`)
- `timestamp` (DateTime, UTC)
- `latitude` (Float)
- `longitude` (Float)
- `wind_speed_kts` (Float, nullable)
- `central_pressure_mb` (Float, nullable)
- `is_forecast` (Boolean, default False)

### `coastal_features`
Boundaries, settlements, critical infrastructure, and marine protected areas.
- `id` (UUID / String, PK)
- `name` (String)
- `feature_type` (String): `settlement`, `port`, `hospital`, `protected_area`, `mangrove`
- `latitude` (Float, nullable)
- `longitude` (Float, nullable)
- `geojson_geometry` (JSONB, nullable)
- `estimated_population` (Integer, nullable)
- `source_id` (FK -> `data_sources.id`)

### `evidence_records`
Fine-grained records of evidence supporting agent findings.
- `id` (String, PK): e.g. `evi_sst_17289901`
- `source_id` (FK -> `data_sources.id`)
- `source_identifier` (String)
- `source_url` (String, nullable)
- `observation_time` (DateTime, UTC, nullable)
- `retrieval_time` (DateTime, UTC)
- `latitude` (Float, nullable)
- `longitude` (Float, nullable)
- `data_type` (String)
- `raw_payload` (JSONB)
- `hash` (String, SHA256 checksum)

### `investigations`
User-initiated multi-agent queries.
- `id` (UUID / String, PK)
- `workspace` (String): `fisherman`, `marine_monitoring`, `protected_areas`, `coastal_authority`, `disaster_management`
- `query` (Text)
- `status` (String): `pending`, `in_progress`, `completed`, `failed`
- `plan` (JSONB)
- `created_at` (DateTime, UTC)
- `completed_at` (DateTime, UTC, nullable)

### `investigation_findings`
Claims produced by agents linked to investigations and evidence.
- `id` (UUID / String, PK)
- `investigation_id` (FK -> `investigations.id`)
- `agent_id` (String): `ocean_research`, `marine_hazard`, `coastal_risk`, `evidence_verification`
- `claim` (Text)
- `value` (Float, nullable)
- `unit` (String, nullable)
- `evidence_ids` (ARRAY of String / JSONB)
- `verification_state` (String): `verified`, `unverified`, `needs_review`, `conflicting`, `insufficient_evidence`
- `uncertainty_notes` (Text, nullable)

### `investigation_events`
Chronological execution events emitted by the orchestrator.
- `id` (UUID / String, PK)
- `investigation_id` (FK -> `investigations.id`)
- `timestamp` (DateTime, UTC)
- `event_type` (String): `investigation_started`, `agent_started`, `tool_completed`, `evidence_added`, `agent_completed`, `verification_passed`, `verification_failed`, `investigation_completed`
- `agent_id` (String, nullable)
- `details` (JSONB)
