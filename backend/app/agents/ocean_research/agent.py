from app.agents.base import BaseAgent, InvestigationTask, AgentResult, AgentStatus


class OceanResearchAgent(BaseAgent):
    """
    Agent 1: Ocean Intelligence & Research Agent (Assigned: Person 1)
    Responsibilities:
    - Sea surface temperature observations & anomalies
    - Wave, wind, current, and marine variables
    - Chlorophyll and ocean-colour indicators
    - Historical time-series comparisons
    """
    agent_id: str = "ocean_research"
    name: str = "Ocean Intelligence & Research Agent"
    description: str = "Investigates marine conditions and environmental patterns using real oceanographic data."

    async def run(self, task: InvestigationTask) -> AgentResult:
        # Scaffold implementation to be expanded by Person 1
        return AgentResult(
            agent_id=self.agent_id,
            status=AgentStatus.COMPLETED,
            findings=[],
            evidence=[],
            limitations=["Ocean Research Agent scaffold initialized; awaiting detailed provider integration."],
            errors=[],
            metadata={"task_id": task.investigation_id}
        )
