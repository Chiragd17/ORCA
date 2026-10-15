# ORCA — Open-Source Marine and Coastal Intelligence Platform

ORCA is an AI-powered marine and coastal intelligence platform that integrates real marine observations, hazard data, coastal geospatial features, scientific analysis, and collaborative AI agents.

The platform coordinates specialized agents through one shared backend, PostgreSQL database, evidence verification system, and frontend interface across five role-oriented workspaces.

---

## 1. Specialist Agents & 3-Person Team Roles

| Role | Assigned Responsibilities | Primary Capabilities |
|---|---|---|
| **Person 1** | Ocean Intelligence & Research Agent | Sea-surface temperature, ocean color/chlorophyll, marine observations, time-series & anomaly analysis |
| **Person 2** | Marine Hazard & Forecast Agent | Cyclone events, IBTrACS track records, GDACS hazard data, marine forecast variables, track playback |
| **Person 3** | Coastal Impact & Risk Agent + Evidence & Scientific Verification Agent + Orchestrator Coordination | Coastal boundaries, settlements, population exposure calculation, evidence verification, orchestrator execution pipeline |

All five workspaces (**Fisherman**, **Marine Monitoring**, **Protected Areas**, **Coastal Authority**, **Disaster Management**) share the exact same backend, database, agents, and Orchestrator.

---

## 2. Shared Technology Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Radix UI, React Router, MapLibre GL JS, Recharts
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PostgreSQL (Psycopg 3), HTTPX, pytest
- **AI Providers**: Groq (primary), Gemini (secondary), OpenRouter (additional)
- **Geospatial & Scientific**: WGS84 coordinates (longitude, latitude), UTC timestamps, deterministic Python calculations

---

## 3. Repository Structure

```text
orca/
├── README.md
├── .gitignore
├── .env.example
├── docs/                      # Shared specifications and contracts
│   ├── architecture.md
│   ├── setup.md
│   ├── api-contract.md
│   ├── database-schema.md
│   ├── agent-contract.md
│   ├── evidence-contract.md
│   ├── data-sources.md
│   └── integration-guide.md
├── backend/                   # Shared FastAPI backend
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── agents/            # Four specialist agents
│   │   │   ├── base.py        # Shared agent contract (MANDATORY)
│   │   │   ├── ocean_research/
│   │   │   ├── marine_hazard/
│   │   │   ├── coastal_risk/
│   │   │   └── evidence_verification/
│   │   ├── orchestrator/      # Orchestrator service & planner
│   │   ├── evidence/          # Shared evidence registry & verification
│   │   ├── providers/         # Shared LLM & data providers
│   │   └── utils/
│   └── tests/
├── frontend/                  # React + Vite application
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── app/router.tsx
│       ├── components/
│       ├── features/          # Five workspaces + investigations
│       └── lib/api-client.ts
├── scripts/                   # Data import and validation utilities
└── data/                      # Local data directory (raw/processed)
```

---

## 4. Quick Start

### Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -e .
cp ../.env.example .env
# Edit .env with your PostgreSQL credentials and API keys

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
cd backend
pytest
```

---

## 5. Non-Negotiable Engineering Rules
1. **Real Data First**: Never fabricate real-world marine conditions, cyclone tracks, population counts, or official warnings.
2. **Deterministic Calculations**: Code handles arithmetic, geospatial distance, and exposure calculations—never an LLM.
3. **Single Source of Truth**: All 3 teammates integrate into this repository, using the shared contracts in `docs/` and `backend/app/agents/base.py`.
