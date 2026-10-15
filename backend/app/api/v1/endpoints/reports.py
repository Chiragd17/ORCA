from fastapi import APIRouter, HTTPException, Path
from app.api.v1.endpoints.investigations import _INVESTIGATION_CACHE

router = APIRouter()


@router.get("/{investigation_id}/report", tags=["Reports"])
async def get_investigation_report(investigation_id: str = Path(...)):
    """Generate a structured markdown report for the given investigation."""
    res = _INVESTIGATION_CACHE.get(investigation_id)
    if not res:
        raise HTTPException(status_code=404, detail="Investigation not found")

    report_lines = [
        f"# ORCA Investigation Report: {res.investigation_id}",
        f"**Workspace:** {res.workspace}",
        f"**Query:** {res.query}",
        f"**Status:** {res.status}",
        "",
        "## Findings",
    ]

    if not res.findings:
        report_lines.append("*No findings generated.*")
    else:
        for f in res.findings:
            unit_str = f" {f.unit}" if f.unit else ""
            val_str = f": **{f.value}{unit_str}**" if f.value is not None else ""
            report_lines.append(f"- **{f.claim}**{val_str}")
            report_lines.append(f"  - Verification: `{f.verification_state}`")
            report_lines.append(f"  - Evidence IDs: {', '.join(f.evidence_ids) if f.evidence_ids else 'None'}")
            if f.uncertainty:
                report_lines.append(f"  - Uncertainty: {f.uncertainty}")

    report_lines.append("")
    report_lines.append("## Evidence Records")
    if not res.evidence:
        report_lines.append("*No evidence records registered.*")
    else:
        for e in res.evidence:
            report_lines.append(f"- `[{e.evidence_id}]` **{e.source_name}** ({e.data_type}) — Time: {e.observation_time or e.retrieval_time}")

    report_lines.append("")
    report_lines.append("## Limitations & Caveats")
    if not res.limitations:
        report_lines.append("*No known limitations recorded.*")
    else:
        for lim in res.limitations:
            report_lines.append(f"- {lim}")

    report_content = "\n".join(report_lines)
    return {
        "investigation_id": res.investigation_id,
        "format": "markdown",
        "content": report_content,
    }
