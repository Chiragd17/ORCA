from typing import List


WORKSPACE_AGENT_ROUTING = {
    "fisherman": ["ocean_research", "marine_hazard", "evidence_verification"],
    "marine_monitoring": ["ocean_research", "evidence_verification"],
    "protected_areas": ["ocean_research", "coastal_risk", "evidence_verification"],
    "coastal_authority": ["coastal_risk", "marine_hazard", "evidence_verification"],
    "disaster_management": ["marine_hazard", "coastal_risk", "evidence_verification"],
}


class InvestigationPlanner:
    """Plans specialist agent dispatch deterministically based on workspace and query keywords."""

    @staticmethod
    def plan(workspace: str, query: str) -> List[str]:
        ws_clean = workspace.lower().replace("-", "_")
        if ws_clean in ["marine_monitoring", "ocean_research"]:
            return ["ocean_research", "evidence_verification"]

        base_agents = WORKSPACE_AGENT_ROUTING.get(ws_clean, ["ocean_research", "evidence_verification"])
        agents = list(base_agents)

        q = query.lower()
        if any(w in q for w in ["cyclone", "storm", "hurricane", "tsunami", "hazard"]) and "marine_hazard" not in agents:
            agents.insert(0, "marine_hazard")
        if any(w in q for w in ["population", "settlement", "infrastructure", "coast", "exposure"]) and "coastal_risk" not in agents:
            agents.insert(0, "coastal_risk")
        if any(w in q for w in ["wave", "wind", "sst", "temperature", "chlorophyll", "current"]) and "ocean_research" not in agents:
            agents.insert(0, "ocean_research")

        # Evidence verification is always the final agent
        if "evidence_verification" in agents:
            agents.remove("evidence_verification")
        agents.append("evidence_verification")

        return agents
