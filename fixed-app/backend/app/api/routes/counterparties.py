"""Counterparty (MGA) routes"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from app.api.deps import get_tenant_context, TenantContext
from app.db.models import Counterparty, Upload
from datetime import datetime

router = APIRouter()

class CounterpartyCreate(BaseModel):
    name: str
    code: str
    contact_email: Optional[str] = None

class CounterpartyResponse(BaseModel):
    id: str
    name: str
    code: str
    contact_email: Optional[str]
    upload_count: int = 0
    class Config:
        from_attributes = True

@router.get("")
async def list_counterparties(ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(
        select(Counterparty).where(Counterparty.tenant_id == ctx.tenant_id).order_by(Counterparty.name)
    )
    counterparties = result.scalars().all()
    
    response = []
    for cp in counterparties:
        count_result = await ctx.db.execute(
            select(func.count(Upload.id)).where(Upload.counterparty_id == cp.id)
        )
        count = count_result.scalar() or 0
        response.append(CounterpartyResponse(
            id=str(cp.id), name=cp.name, code=cp.code,
            contact_email=cp.contact_email, upload_count=count
        ))
    return response

@router.post("", response_model=CounterpartyResponse)
async def create_counterparty(data: CounterpartyCreate, ctx: TenantContext = Depends(get_tenant_context)):
    existing = await ctx.db.execute(
        select(Counterparty).where(
            Counterparty.tenant_id == ctx.tenant_id,
            Counterparty.code == data.code.upper()
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail=f"Code '{data.code}' already exists")
    
    cp = Counterparty(
        tenant_id=ctx.tenant_id, name=data.name, code=data.code.upper(),
        contact_email=data.contact_email, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
    )
    ctx.db.add(cp)
    await ctx.db.commit()
    await ctx.db.refresh(cp)
    
    return CounterpartyResponse(id=str(cp.id), name=cp.name, code=cp.code, contact_email=cp.contact_email)

@router.delete("/{cp_id}", status_code=204)
async def delete_counterparty(cp_id: str, ctx: TenantContext = Depends(get_tenant_context)):
    result = await ctx.db.execute(
        select(Counterparty).where(Counterparty.id == uuid.UUID(cp_id), Counterparty.tenant_id == ctx.tenant_id)
    )
    cp = result.scalar()
    if not cp:
        raise HTTPException(status_code=404, detail="Not found")
    
    # Check for uploads
    count_result = await ctx.db.execute(
        select(func.count(Upload.id)).where(Upload.counterparty_id == cp.id)
    )
    if count_result.scalar() > 0:
        raise HTTPException(status_code=400, detail="Cannot delete - has uploads")
    
    await ctx.db.delete(cp)
    await ctx.db.commit()
