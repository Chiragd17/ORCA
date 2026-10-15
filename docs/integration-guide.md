# ORCA Team Integration Guide

This guide establishes the collaboration workflow for the 3-person engineering team.

---

## 1. Role Allocations

- **Person 1 (Ocean Research)**:
  - Branch: `feature/person-1-ocean-research`
  - Scope: `backend/app/agents/ocean_research/`, `backend/app/providers/data/` (marine data), tests for Agent 1.
- **Person 2 (Marine Hazard)**:
  - Branch: `feature/person-2-marine-hazard`
  - Scope: `backend/app/agents/marine_hazard/`, `backend/app/providers/data/` (hazard/cyclone data), tests for Agent 2.
- **Person 3 (Coastal Risk + Verification + Orchestrator)**:
  - Branch: `feature/person-3-coastal-orchestrator`
  - Scope: `backend/app/agents/coastal_risk/`, `backend/app/agents/evidence_verification/`, `backend/app/orchestrator/`, `backend/app/evidence/`, integration tests.

---

## 2. Git Rules

1. **Main Branch is Sacred**: `main` contains working, tested baseline code.
2. **Coordinate Shared Files**:
   - `backend/app/agents/base.py`
   - `backend/app/db/base.py` & models
   - `backend/alembic/`
   - `frontend/src/lib/api-client.ts`
   Any changes to shared contracts MUST be coordinated with the team before merging.
3. **Never Force Push** to `main`.
4. **Small Pull Requests**: Commit small, logical changes with descriptive messages.

---

## 3. Migration and Database Coordination

- Always run `alembic check` and ensure single head in Alembic before submitting a PR.
- If two teammates created migrations, Person 3 will reconcile the Alembic revision chain (`alembic merge heads -m "merge revisions"`).
