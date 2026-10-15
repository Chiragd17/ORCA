# ORCA Evidence and Scientific Verification Contract

Evidence verification is a core pillar of ORCA. No claim can be presented as verified without traceable evidence.

---

## 1. Evidence Record Schema (`EvidenceRecord`)

Defined in `backend/app/evidence/schemas.py`:

```json
{
  "evidence_id": "evi_sst_20261015_001",
  "source_name": "Open-Meteo Marine API",
  "source_url": "https://marine-api.open-meteo.com/v1/marine?latitude=12.91&longitude=74.85...",
  "source_identifier": "open-meteo:hourly:wave_height:2026-10-15T06:00",
  "observation_time": "2026-10-15T06:00:00Z",
  "retrieval_time": "2026-10-15T13:40:00Z",
  "latitude": 12.91,
  "longitude": 74.85,
  "data_type": "wave_forecast",
  "raw_data": {
    "wave_height": 1.4,
    "wave_direction": 240,
    "wave_period": 8.5
  },
  "units": {
    "wave_height": "m",
    "wave_period": "s"
  },
  "dataset_metadata": {
    "model": "ECMWF WAM",
    "resolution_deg": 0.1
  }
}
```

---

## 2. Verification States

Every finding evaluated by Agent 4 receives a `VerificationState`:
- `VERIFIED`: Supporting evidence exists, timestamps and coordinates match the query, units are compatible, and deterministic calculations were reproduced.
- `UNVERIFIED`: Claim lacks direct supporting evidence or evidence metadata is incomplete.
- `NEEDS_REVIEW`: Ambiguity detected, e.g., using a forecast model when historical observations were requested, or moderate spatial distance offset.
- `CONFLICTING`: Two or more evidence records directly contradict the claim or each other.
- `INSUFFICIENT_EVIDENCE`: The available evidence records are too sparse (e.g. attempting to calculate a 5-year trend with only 3 months of observations).

---

## 3. Verification Rules
1. **Evidence ID Resolution**: Every ID in `finding.evidence_ids` must correspond to an actual `EvidenceRecord` in the shared registry or database.
2. **Freshness and Temporal Alignment**: Ensure historical observations are not represented as live conditions.
3. **Deterministic Reproduction**: Any derived statistics (averages, distance to coast, population sums) must be independently recomputed by Python verification functions.
4. **Transparency**: The verification agent explains why any finding was downgraded or flagged.
