# ORCA Shared API Contract

All API endpoints are hosted under `/api/v1/` except for the root health endpoint.

## 1. System Endpoints

### `GET /health`
- **Description**: Returns system status, active database connectivity, and backend build version.
- **Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "0.1.0"
}
```

---

## 2. Marine & Observations

### `GET /api/v1/marine/observations`
- **Query Parameters**:
  - `lat` (float, required): Latitude (-90.0 to 90.0)
  - `lon` (float, required): Longitude (-180.0 to 180.0)
  - `start_time` (ISO8601 string, optional): UTC start time
  - `end_time` (ISO8601 string, optional): UTC end time
  - `variables` (comma-separated list, optional): e.g., `sst,wave_height,wave_period,wind_speed`
- **Response**:
```json
{
  "location": {"latitude": 12.87, "longitude": 74.88},
  "temporal_coverage": {"start": "2026-10-01T00:00:00Z", "end": "2026-10-15T00:00:00Z"},
  "observations": [
    {
      "timestamp": "2026-10-14T12:00:00Z",
      "variable": "sst",
      "value": 29.2,
      "unit": "°C",
      "source": "open-meteo-marine",
      "evidence_id": "evi_sst_001"
    }
  ]
}
```

---

## 3. Marine Hazards & Disasters

### `GET /api/v1/hazards`
- **Query Parameters**:
  - `min_lat`, `max_lat`, `min_lon`, `max_lon` (bounding box, optional)
  - `hazard_type` (e.g., `cyclone`, `flood`, `storm_surge`, optional)
  - `status` (`active`, `historical`, `all`, default: `all`)
- **Response**:
```json
{
  "count": 1,
  "hazards": [
    {
      "hazard_id": "ibtracs_2024_aravind",
      "name": "Cyclone Aravind",
      "hazard_type": "cyclone",
      "basin": "north_indian",
      "status": "historical",
      "first_detected": "2024-05-10T06:00:00Z",
      "last_detected": "2024-05-14T18:00:00Z",
      "tracks": [
        {
          "timestamp": "2024-05-10T06:00:00Z",
          "latitude": 11.2,
          "longitude": 72.4,
          "wind_speed_kts": 45,
          "pressure_mb": 996
        }
      ]
    }
  ]
}
```

---

## 4. Investigations (Orchestration Pipeline)

### `POST /api/v1/investigations`
- **Request Body**:
```json
{
  "workspace": "fisherman",
  "query": "Investigate offshore wave and wind conditions near Mangaluru for tomorrow morning.",
  "location": {
    "latitude": 12.91,
    "longitude": 74.85,
    "radius_km": 25.0
  },
  "time_range": {
    "start": "2026-10-16T00:00:00Z",
    "end": "2026-10-16T12:00:00Z"
  }
}
```
- **Response (201 Created)**:
```json
{
  "investigation_id": "inv_98f4c281",
  "status": "in_progress",
  "workspace": "fisherman",
  "created_at": "2026-10-15T13:45:00Z",
  "planned_agents": ["ocean_research", "marine_hazard", "evidence_verification"]
}
```

### `GET /api/v1/investigations/{investigation_id}`
- **Response**:
```json
{
  "investigation_id": "inv_98f4c281",
  "status": "completed",
  "workspace": "fisherman",
  "query": "Investigate offshore wave and wind...",
  "findings": [
    {
      "claim": "Wave height predicted between 1.2m and 1.8m",
      "value": 1.5,
      "unit": "m",
      "evidence_ids": ["evi_wav_101"],
      "agent_id": "ocean_research",
      "verification_state": "verified"
    }
  ],
  "limitations": [
    "High-resolution coastal bathymetry not available for nearshore breakers."
  ],
  "verification_summary": {
    "status": "verified",
    "verified_findings_count": 1,
    "unverified_findings_count": 0,
    "notes": "Forecast timestamps align with query; Open-Meteo marine model consulted."
  }
}
```

### `GET /api/v1/investigations/{investigation_id}/events`
- **Response**: List of chronological execution events.

### `GET /api/v1/investigations/{investigation_id}/evidence`
- **Response**: List of all `EvidenceRecord` objects referenced by this investigation.

### `GET /api/v1/investigations/{investigation_id}/report`
- **Response**: Markdown/PDF formatted report summarizing the complete investigation with citations.
