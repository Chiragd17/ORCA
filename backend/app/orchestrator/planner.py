from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


WORKSPACE_AGENT_ROUTING = {
    "fisherman": ["ocean_research", "marine_hazard", "evidence_verification"],
    "marine_monitoring": ["ocean_research", "evidence_verification"],
    "protected_areas": ["ocean_research", "coastal_risk", "evidence_verification"],
    "coastal_authority": ["coastal_risk", "marine_hazard", "evidence_verification"],
    "disaster_management": ["marine_hazard", "coastal_risk", "evidence_verification"],
}


class PlanStep(BaseModel):
    step_id: str
    agent_id: str
    agent_name: str
    phase: str = Field(..., description="'specialist_concurrent' | 'specialist_dependent' | 'scientific_auditor'")
    dependencies: List[str] = Field(default_factory=list)
    description: str
    timeout_seconds: float = 20.0
    max_retries: int = 2


class ExecutionPlan(BaseModel):
    plan_id: str
    workspace: str
    query: str
    normalized_intent: str
    target_coordinates: Dict[str, Optional[float]]
    target_time_horizon: str
    steps: List[PlanStep]
    selected_agents: List[str]
    verification_required: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def get_concurrent_steps(self) -> List[PlanStep]:
        return [s for s in self.steps if not s.dependencies and s.phase != "scientific_auditor"]

    def get_dependent_steps(self) -> List[PlanStep]:
        return [s for s in self.steps if s.dependencies and s.phase != "scientific_auditor"]

    def get_verification_step(self) -> Optional[PlanStep]:
        for s in self.steps:
            if s.phase == "scientific_auditor":
                return s
        return None


class InvestigationPlanner:
    """Plans specialist agent dispatch deterministically based on workspace, geographic context, and analytical objective."""

    AGENT_METADATA = {
        "ocean_research": {
            "name": "Ocean Intelligence & Research Agent",
            "keywords": ["wave", "wind", "sst", "temperature", "chlorophyll", "current", "salinity", "anomaly", "thermal", "plankton", "historical"],
        },
        "marine_hazard": {
            "name": "Marine Hazard & Forecast Agent",
            "keywords": ["cyclone", "storm", "hurricane", "tsunami", "hazard", "surge", "swell", "gale", "alert", "forecast", "track", "douglas", "warning"],
        },
        "coastal_risk": {
            "name": "Coastal Impact & Risk Agent",
            "keywords": ["population", "settlement", "infrastructure", "coast", "exposure", "port", "karnataka", "mangaluru", "udupi", "karwar", "vulnerability"],
        },
        "evidence_verification": {
            "name": "Evidence & Scientific Verification Agent",
            "keywords": ["verify", "claim", "evidence", "provenance", "audit", "sha256", "conflict", "gap", "discrepancy", "check", "validation"],
        },
    }

    @classmethod
    def normalize_intent(cls, workspace: str, query: str) -> str:
        q = query.lower()
        if any(w in q for w in ["cyclone", "storm", "tsunami"]) and any(w in q for w in ["population", "settlement", "exposure", "risk"]):
            return "compound_disaster_coastal_exposure"
        elif any(w in q for w in ["cyclone", "storm", "hurricane", "tsunami", "hazard", "alert"]):
            return "marine_hazard_tracking"
        elif any(w in q for w in ["population", "settlement", "infrastructure", "exposure", "risk"]):
            return "coastal_vulnerability_assessment"
        elif any(w in q for w in ["temperature", "sst", "chlorophyll", "current", "anomaly"]):
            return "oceanographic_environmental_monitoring"
        elif any(w in q for w in ["verify", "claim", "provenance", "conflict", "audit"]):
            return "scientific_evidence_verification"
        return f"{workspace}_general_inquiry"

    @classmethod
    def plan(cls, workspace: str, query: str) -> List[str]:
        """Backwards-compatible agent list planner."""
        ws_clean = workspace.lower().replace("-", "_")
        if ws_clean in ["marine_monitoring", "ocean_research"]:
            base_agents = ["ocean_research", "evidence_verification"]
        else:
            base_agents = WORKSPACE_AGENT_ROUTING.get(ws_clean, ["ocean_research", "evidence_verification"])
        
        agents = list(base_agents)
        q = query.lower()

        # Intent-driven inclusion
        if any(w in q for w in cls.AGENT_METADATA["marine_hazard"]["keywords"]) and "marine_hazard" not in agents:
            agents.insert(0, "marine_hazard")
        if any(w in q for w in cls.AGENT_METADATA["coastal_risk"]["keywords"]) and "coastal_risk" not in agents:
            agents.insert(0, "coastal_risk")
        if any(w in q for w in cls.AGENT_METADATA["ocean_research"]["keywords"]) and "ocean_research" not in agents:
            agents.insert(0, "ocean_research")

        # Evidence verification is always the mandatory final audit agent
        if "evidence_verification" in agents:
            agents.remove("evidence_verification")
        agents.append("evidence_verification")

        return agents

    @classmethod
    def create_plan(
        cls,
        workspace: str,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: Optional[float] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> ExecutionPlan:
        """Constructs an executable structured multi-agent plan with explicit dependency and concurrency tracking."""
        import uuid
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        planned_agent_ids = cls.plan(workspace, query)
        intent = cls.normalize_intent(workspace, query)

        # Coordinate bounding defaults (defaulting to Karnataka / Arabian Sea corridor if unspecified)
        target_lat = latitude if latitude is not None else 13.50
        target_lon = longitude if longitude is not None else 74.50
        target_rad = radius_km if radius_km is not None else 150.0

        steps: List[PlanStep] = []
        has_hazard = "marine_hazard" in planned_agent_ids
        has_risk = "coastal_risk" in planned_agent_ids
        has_ocean = "ocean_research" in planned_agent_ids

        # 1. Independent Specialist Phase (Ocean Research and Marine Hazard can run concurrently)
        if has_ocean:
            steps.append(
                PlanStep(
                    step_id="step_ocean_research",
                    agent_id="ocean_research",
                    agent_name="Ocean Intelligence & Research Agent",
                    phase="specialist_concurrent",
                    dependencies=[],
                    description="Analyze physical SST, thermal anomalies, currents, and biochemical chlorophyll-a spectra.",
                    timeout_seconds=20.0,
                    max_retries=2,
                )
            )

        if has_hazard:
            steps.append(
                PlanStep(
                    step_id="step_marine_hazard",
                    agent_id="marine_hazard",
                    agent_name="Marine Hazard & Forecast Agent",
                    phase="specialist_concurrent",
                    dependencies=[],
                    description="Ingest storm track, Douglas sea state wave spectra, and meteorological alerts.",
                    timeout_seconds=20.0,
                    max_retries=2,
                )
            )

        # 2. Dependent Specialist Phase (Coastal Risk depends on Marine Hazard if both present)
        if has_risk:
            deps = ["step_marine_hazard"] if has_hazard else []
            phase = "specialist_dependent" if deps else "specialist_concurrent"
            desc = (
                "Evaluate coastal settlement and population exposure using upstream hazard wave and surge parameters."
                if deps
                else "Analyze spatial exposure and vulnerability for settlements and coastal infrastructure."
            )
            steps.append(
                PlanStep(
                    step_id="step_coastal_risk",
                    agent_id="coastal_risk",
                    agent_name="Coastal Impact & Risk Agent",
                    phase=phase,
                    dependencies=deps,
                    description=desc,
                    timeout_seconds=20.0,
                    max_retries=2,
                )
            )

        # 3. Mandatory Scientific Verification Phase (Depends on all upstream specialist findings)
        upstream_step_ids = [s.step_id for s in steps]
        steps.append(
            PlanStep(
                step_id="step_evidence_verification",
                agent_id="evidence_verification",
                agent_name="Evidence & Scientific Verification Agent",
                phase="scientific_auditor",
                dependencies=upstream_step_ids,
                description="Independently verify scientific claims, cryptographic SHA-256 evidence integrity, units, and detect cross-source conflicts.",
                timeout_seconds=25.0,
                max_retries=1,
            )
        )

        return ExecutionPlan(
            plan_id=plan_id,
            workspace=workspace,
            query=query,
            normalized_intent=intent,
            target_coordinates={"latitude": target_lat, "longitude": target_lon, "radius_km": target_rad},
            target_time_horizon="7-day numerical forecast + historical baseline",
            steps=steps,
            selected_agents=planned_agent_ids,
            verification_required=True,
        )

