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
            unit_str = f" {getattr(f, 'unit', '')}" if getattr(f, 'unit', None) else ""
            val_str = f": **{getattr(f, 'value', '')}{unit_str}**" if getattr(f, 'value', None) is not None else ""
            v_state = getattr(f, "verification_state", None) or getattr(f, "verification_status", "unverified")
            report_lines.append(f"- **{getattr(f, 'claim', '')}**{val_str}")
            report_lines.append(f"  - Verification: `{v_state}`")
            ev_ids = getattr(f, 'evidence_ids', [])
            report_lines.append(f"  - Evidence IDs: {', '.join(ev_ids) if ev_ids else 'None'}")
            if getattr(f, 'uncertainty', None):
                report_lines.append(f"  - Uncertainty: {f.uncertainty}")

    report_lines.append("")
    report_lines.append("## Evidence Records")
    if not res.evidence:
        report_lines.append("*No evidence records registered.*")
    else:
        for e in res.evidence:
            e_id = getattr(e, "evidence_id", None) or getattr(e, "id", "unknown")
            e_src = getattr(e, "source_name", None) or getattr(e, "source_id", "Unknown")
            e_dt = getattr(e, "data_type", "observation")
            e_time = getattr(e, "observation_time", None) or getattr(e, "timestamp", None) or getattr(e, "retrieval_time", "N/A")
            report_lines.append(f"- `[{e_id}]` **{e_src}** ({e_dt}) — Time: {e_time}")

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
