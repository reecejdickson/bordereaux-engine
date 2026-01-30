"""Upload routes"""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.api.deps import get_db, get_tenant_context, TenantContext
from app.db.models import Upload, ProcessingRun, Issue, UploadStatus, RunStatus, RecordType, IssueSeverity
from app.core.security import hash_file
from app.services.storage import storage_service
from app.parsers.validator import validate_file

router = APIRouter()

class UploadResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    status: str
    record_type: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class RunResponse(BaseModel):
    id: str
    run_number: int
    status: str
    total_rows: int
    issues_p0: int
    issues_p1: int
    issues_p2: int
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    class Config:
        from_attributes = True

@router.get("")
async def list_uploads(ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(
        select(Upload).where(Upload.tenant_id == ctx.tenant_id).order_by(Upload.created_at.desc())
    )
    uploads = result.scalars().all()
    return {"items": [UploadResponse(
        id=str(u.id), filename=u.filename, original_filename=u.original_filename,
        file_size=u.file_size, status=u.status.value, record_type=u.record_type.value if u.record_type else None,
        created_at=u.created_at
    ) for u in uploads], "total": len(uploads)}

@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    record_type: str = Form("premium"),
    ctx: TenantContext = Depends(get_tenant_context)
):
    content = await file.read()
    file_hash = hash_file(content)
    storage_path = storage_service.save_file(content, ctx.tenant_id, file.filename)
    
    upload = Upload(
        tenant_id=ctx.tenant_id, uploaded_by=ctx.user_id, filename=f"{uuid.uuid4()}_{file.filename}",
        original_filename=file.filename, file_size=len(content), file_hash=file_hash,
        mime_type=file.content_type or "application/octet-stream", storage_path=storage_path,
        status=UploadStatus.PROCESSING, record_type=RecordType(record_type) if record_type in ["premium", "claims"] else None
    )
    ctx.db.add(upload)
    await ctx.db.flush()
    
    # Create processing run
    run = ProcessingRun(upload_id=upload.id, run_number=1, status=RunStatus.VALIDATING, started_at=datetime.utcnow())
    ctx.db.add(run)
    await ctx.db.flush()
    
    # Validate file and create issues
    issues = validate_file(content, file.filename, record_type)
    for issue_data in issues:
        issue = Issue(
            run_id=run.id, rule_id=issue_data["rule_id"], severity=IssueSeverity(issue_data["severity"]),
            title=issue_data["title"], description=issue_data["description"],
            cell_reference=issue_data.get("cell_reference"), actual_value=issue_data.get("actual_value"),
            expected_value=issue_data.get("expected_value"), row_index=issue_data.get("row_index")
        )
        ctx.db.add(issue)
    
    run.status = RunStatus.COMPLETED
    run.completed_at = datetime.utcnow()
    run.total_rows = len(issues)
    run.issues_p0 = len([i for i in issues if i["severity"] == "P0"])
    run.issues_p1 = len([i for i in issues if i["severity"] == "P1"])
    run.issues_p2 = len([i for i in issues if i["severity"] == "P2"])
    upload.status = UploadStatus.COMPLETED
    
    await ctx.db.commit()
    await ctx.db.refresh(upload)
    
    return UploadResponse(
        id=str(upload.id), filename=upload.filename, original_filename=upload.original_filename,
        file_size=upload.file_size, status=upload.status.value,
        record_type=upload.record_type.value if upload.record_type else None, created_at=upload.created_at
    )

@router.get("/{upload_id}")
async def get_upload(upload_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(
        select(Upload).where(Upload.id == uuid.UUID(upload_id), Upload.tenant_id == ctx.tenant_id)
    )
    upload = result.scalar()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    return UploadResponse(
        id=str(upload.id), filename=upload.filename, original_filename=upload.original_filename,
        file_size=upload.file_size, status=upload.status.value,
        record_type=upload.record_type.value if upload.record_type else None, created_at=upload.created_at
    )

@router.get("/{upload_id}/runs")
async def get_runs(upload_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(
        select(ProcessingRun).where(ProcessingRun.upload_id == uuid.UUID(upload_id))
    )
    runs = result.scalars().all()
    return [RunResponse(
        id=str(r.id), run_number=r.run_number, status=r.status.value, total_rows=r.total_rows,
        issues_p0=r.issues_p0, issues_p1=r.issues_p1, issues_p2=r.issues_p2,
        started_at=r.started_at, completed_at=r.completed_at
    ) for r in runs]
