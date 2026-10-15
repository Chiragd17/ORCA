from typing import Dict, Optional, List
from app.evidence.schemas import EvidenceRecord


class EvidenceRegistry:
    """In-memory and database-backed registry for tracking evidence records during an investigation."""

    def __init__(self):
        self._records: Dict[str, EvidenceRecord] = {}

    def register(self, record: EvidenceRecord) -> EvidenceRecord:
        """Add an evidence record to the registry."""
        self._records[record.evidence_id] = record
        return record

    def register_many(self, records: List[EvidenceRecord]) -> List[EvidenceRecord]:
        for r in records:
            self.register(r)
        return records

    def get(self, evidence_id: str) -> Optional[EvidenceRecord]:
        return self._records.get(evidence_id)

    def get_many(self, evidence_ids: List[str]) -> List[EvidenceRecord]:
        return [self._records[eid] for eid in evidence_ids if eid in self._records]

    def all(self) -> List[EvidenceRecord]:
        return list(self._records.values())

    def clear(self) -> None:
        self._records.clear()
