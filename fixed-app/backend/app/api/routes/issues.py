"""Issue routes"""
import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.api.deps import get_db, get_tenant_context, TenantContext
from app.db.models import Issue, ProcessingRun, Upload

router = APIRouter()

class IssueResponse(BaseModel):
    id: str
    rule_id: str
    severity: str
    status: str
    title: str
    description: str
    cell_reference: Optional[str]
    actual_value: Optional[str]
    expected_value: Optional[str]
    row_index: Optional[int]
    created_at: datetime
    evidence: list = []
    class Config:
        from_attributes = True

@router.get("")
async def list_issues(
    run_id: Optional[str] = None,
    upload_id: Optional[str] = None,
    severity: Optional[List[str]] = Query(None),
    status: Optional[List[str]] = Query(None),
    ctx: TenantContext = Depends(get_tenant_context)
):
    query = select(Issue).join(ProcessingRun).join(Upload).where(Upload.tenant_id == ctx.tenant_id)
    if run_id:
        query = query.where(Issue.run_id == uuid.UUID(run_id))
    if upload_id:
        query = query.where(ProcessingRun.upload_id == uuid.UUID(upload_id))
    if severity:
        query = query.where(Issue.severity.in_(severity))
    if status:
        query = query.where(Issue.status.in_(status))
    
    result = await ctx.db.execute(query.order_by(Issue.created_at.desc()))
    issues = result.scalars().all()
    
    return {"items": [IssueResponse(
        id=str(i.id), rule_id=i.rule_id, severity=i.severity.value, status=i.status.value,
        title=i.title, description=i.description, cell_reference=i.cell_reference,
        actual_value=i.actual_value, expected_value=i.expected_value, row_index=i.row_index,
        created_at=i.created_at, evidence=[{
            "id": str(uuid.uuid4()), "sheet_name": "Sheet1", "cell_reference": i.cell_reference or "N/A",
            "row_index": i.row_index or 0, "column_index": 0, "column_name": "Column",
            "actual_value": i.actual_value, "expected_value": i.expected_value, "evidence_type": "validation"
        }] if i.cell_reference else []
    ) for i in issues], "total": len(issues)}

@router.get("/{issue_id}")
async def get_issue(issue_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(select(Issue).where(Issue.id == uuid.UUID(issue_id)))
    issue = result.scalar()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return IssueResponse(
        id=str(issue.id), rule_id=issue.rule_id, severity=issue.severity.value, status=issue.status.value,
        title=issue.title, description=issue.description, cell_reference=issue.cell_reference,
        actual_value=issue.actual_value, expected_value=issue.expected_value, row_index=issue.row_index,
        created_at=issue.created_at, evidence=[{
            "id": str(uuid.uuid4()), "sheet_name": "Sheet1", "cell_reference": issue.cell_reference or "N/A",
            "row_index": issue.row_index or 0, "column_index": 0, "column_name": "Column",
            "actual_value": issue.actual_value, "expected_value": issue.expected_value, "evidence_type": "validation"
        }] if issue.cell_reference else []
    )

@router.patch("/{issue_id}")
async def update_issue(issue_id: str, data: dict, ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(select(Issue).where(Issue.id == uuid.UUID(issue_id)))
    issue = result.scalar()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    if "status" in data:
        issue.status = data["status"]
    await ctx.db.commit()
    return {"success": True}

@router.post("/bulk-update")
async def bulk_update(data: dict, ctx: TenantContext = Depends(get_tenant_context)):
    issue_ids = data.get("issue_ids", [])
    new_status = data.get("status")
    count = 0
    for iid in issue_ids:
        result = await ctx.db.execute(select(Issue).where(Issue.id == uuid.UUID(iid)))
        issue = result.scalar()
        if issue:
            issue.status = new_status
            count += 1
    await ctx.db.commit()
    return {"updated": count}
