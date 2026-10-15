# ORCA Shared Agent Contract

Every specialist agent in ORCA must implement the identical contract located in `backend/app/agents/base.py`.

```python
async def run(task: InvestigationTask) -> AgentResult:
    ...
```

---

## 1. Core Data Models

### `AgentStatus` (Enum)
- `COMPLETED`: Agent ran successfully, produced findings backed by evidence.
- `PARTIAL`: Completed some tasks, but parts failed or lacked sufficient data.
- `UNAVAILABLE`: Upstream provider or data source unreachable/offline.
- `FAILED`: Execution suffered an unhandled runtime error.

### `InvestigationTask` (Pydantic Model)
- `investigation_id`: Unique identifier for the parent investigation.
- `workspace`: Active workspace (`fisherman`, `marine_monitoring`, etc.).
- `query`: The user question or sub-task prompt.
- `latitude`: Optional target latitude (WGS84).
- `longitude`: Optional target longitude (WGS84).
- `radius_km`: Optional geographic radius in kilometers.
- `start_time`: Optional UTC start datetime.
- `end_time`: Optional UTC end datetime.
- `parameters`: Optional dictionary for specialist parameters.

### `Finding` (Pydantic Model)
- `finding_id`: Stable unique ID for this claim.
- `claim`: Clear statement or measurement description.
- `value`: Optional numeric measurement or statistic.
- `unit`: Optional physical unit (e.g., `°C`, `m/s`, `knots`).
- `evidence_ids`: List of evidence identifiers supporting this claim.
- `is_forecast`: Boolean distinguishing observation from forecast.
- `uncertainty`: Description of dataset limitation or error bounds.
- `verification_state`: Assigned by verification (`verified`, `unverified`, etc.).

### `AgentResult` (Pydantic Model)
- `agent_id`: Identifier of the agent (`ocean_research`, `marine_hazard`, `coastal_risk`, `evidence_verification`).
- `status`: `AgentStatus` value.
- `findings`: List of `Finding` objects.
- `evidence`: List of `EvidenceRecord` objects collected during execution.
- `limitations`: Explicit list of known limitations, missing data, or caveats.
- `errors`: List of error messages encountered during tool/API calls.
- `metadata`: Optional extra dictionary.

---

## 2. Agent Base Class

```python
from abc import ABC, abstractmethod
from backend.app.agents.base import InvestigationTask, AgentResult

class BaseAgent(ABC):
    agent_id: str
    name: str
    description: str

    @abstractmethod
    async def run(self, task: InvestigationTask) -> AgentResult:
        """Execute agent analysis for the given investigation task."""
        pass
```

All 4 agents (`ocean_research`, `marine_hazard`, `coastal_risk`, `evidence_verification`) must inherit from `BaseAgent`.
