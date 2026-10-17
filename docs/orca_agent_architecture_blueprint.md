# ORCA AI — Specialist Agent Workspace Architecture Blueprint

**Version:** 1.0.0  
**Status:** Canonical Standard for ORCA Multi-Agent Workspaces  
**Reference Implementations:**  
- **Person 3:** Coastal Impact & Risk Agent (`/agents/coastal-risk`)
- **Person 1:** Ocean Intelligence & Research Agent (`/agents/ocean-research`)
- **Target Implementation (Next):** **Person 2: Marine Hazard & Forecast Agent (`/agents/marine-hazard`)**

---

## 1. Architectural Philosophy

Every specialist agent in ORCA follows an identical structural, functional, and visual blueprint to maintain high information density, zero-hallucination evidence provenance, and a uniform user experience.

---

## 2. The 6 Standard Workspace Zones

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1: Workspace Header                                                                    │
│ Agent Title • Assigned Role • Mission Statement • Real-time Last Updated • Refresh Action   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2: Parameter & Investigation Controls                                                  │
│ Geographic Sector Presets • Temporal Horizon / Storm Selector • Variable Filters • Run CTA  │
├──────────────────────────────────────────────────────────────┬──────────────────────────────┤
│ ZONE 3A: Interactive MapLibre Map (3 Cols)                   │ ZONE 3B: Summary Cards &     │
│ • Karnataka Coast & Arabian Sea Bounds                       │          Status Badge (2 Cols│
│ • Station Markers / Cyclone Tracks / Geometries              │ • 4 Metric Cards with Units  │
│ • Scientific Layer Toggles & Interactive Legend              │ • Regime / Risk Alert Badge  │
├──────────────────────────────────────────────────────────────┴──────────────────────────────┤
│ ZONE 4: Scientific Analytics Row (3 Recharts Visualizations)                                │
│ [Chart 1: Primary Trajectory]   [Chart 2: Anomaly / Severity]   [Chart 3: Physical Dynamics]│
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 5: Detailed Results Panes (5-Tab Standard Table)                                       │
│ [Tab 1: Records/Features]  [Tab 2: Findings]  [Tab 3: Evidence Ledger]  [Methodology] [Limits] │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ ZONE 6: Right Intelligence Rail (340px Fixed, hidden on mobile / visible on xl screens)     │
│ • Live Data Status Panel (4 Provider Feeds + "View Live" metadata modal)                   │
│ • Recent Findings Panel (Click-to-open verification modal + "View all" dialog)             │
│ • Data Sources & Provenance Panel (Open licenses, geodetic bounds, SHA-256 copy-hash)       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Checklist for Person 2 (Marine Hazard & Forecast Agent)

When linking **Person 2 (`marine-hazard`)**, apply this exact checklist:

### A. Navigation & Agents Hub (`frontend/src/features/agents-hub/index.tsx`)
- Set `route: '/agents/marine-hazard'`
- Set `isInteractive: true`
- The entire card container `div` must have:
  - `onClick={() => navigate(agent.route!)}`
  - `onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(agent.route!)}`
  - `role="button"`, `tabIndex={0}`
  - Hover states: `hover:border-orange-500 hover:shadow-lg`
  - Action button inside has `e.stopPropagation()` to avoid event bubbling.
  - **No modal or specification-only interstitial.** Direct 1-click launch to the full workspace.

### B. Router Integration (`frontend/src/app/router.tsx`)
- Import `MarineHazardWorkspace` from `../features/marine-hazard`.
- Mount at `path: 'agents/marine-hazard'`.
- Alias route `disaster-management` to `MarineHazardWorkspace`.

### C. Feature Folder & Component Structure (`frontend/src/features/marine-hazard/`)
```
src/features/marine-hazard/
├── index.tsx                             # Main workspace coordinator (auto-runs on mount)
└── components/
    ├── index.ts                          # Barrel export
    ├── HazardWorkspaceHeader.tsx         # Title, mission, last updated, refresh
    ├── HazardControls.tsx                # Cyclone tracks, storm intensity, wind/surge horizons
    ├── HazardMap.tsx                     # MapLibre with cone of uncertainty, wind radiuses, storm eye
    ├── HazardSummaryCards.tsx            # 4 cards: Max Wind (kts), Central Pressure (hPa), Storm Surge (m), Landfall ETA
    ├── HazardLevelBadge.tsx              # Cyclone category badge (Depression, CS, VSCS, Super Cyclone)
    ├── CycloneTrackChart.tsx             # Recharts: Storm barometric pressure & wind trajectory over time
    ├── StormSurgeChart.tsx               # Recharts: Coastal water level surge above astronomical tide
    ├── GaleWindFieldChart.tsx            # Recharts: Gale radius distribution across Karnataka coastal sectors
    ├── HazardDetailedResults.tsx         # 5 tabs: Storm Advisories, Findings, Evidence Ledger (SHA-256), Methodology, Limitations
    ├── HazardLiveDataStatus.tsx          # IMD RSMC, GDACS, IBTrACS, INCOIS Wave Feeds + View Live modal
    ├── HazardRecentFindings.tsx          # Real hazard findings with modal inspection
    └── HazardDataProvenance.tsx          # Provenance, licenses, SHA-256 copy-hash modal
```

### D. Backend REST Endpoint (`backend/app/api/v1/endpoints/hazards.py`)
- `GET /api/v1/hazards/workspace`
- Query parameters: `lat`, `lon`, `radius_km`, `hazard_type` (cyclone, gale, swell, flood).
- Real data integration: IBTrACS precedent tracks (Tauktae, Ockhi), GDACS live alerts, and deterministic wind/surge threshold calculations.
- Returns: `summary`, `tracks`, `alerts`, `observations`, `evidence` (with SHA-256 hashes), and `limitations`.

### E. Evidence & Verification Contract
- Every claim must emit an `EvidenceRecord` with:
  - `evidence_id`: e.g. `evi_hazard_cyclone_tauktae_track_01`
  - `source_name`: e.g. `IBTrACS / IMD RSMC Cyclone Track Archive`
  - `payload_hash`: SHA-256 checksum of canonical raw payload.
  - Compatible with Person 4 (`Evidence & Scientific Verification Agent`).

### F. Strict Isolation & Regression Protection
- Person 1 (`/agents/ocean-research`) and Person 3 (`/agents/coastal-risk`) must remain completely untouched.
- All existing tests in `person3/backend/tests` must continue to pass with 0 failures.
