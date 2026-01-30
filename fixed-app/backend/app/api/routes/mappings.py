"""Column mapping routes"""
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.api.deps import get_tenant_context, TenantContext

router = APIRouter()

# Canonical field schema
CANONICAL_FIELDS = {
    "premium": [
        {"name": "policy_reference", "display_name": "Policy Reference", "required": True},
        {"name": "insured_name", "display_name": "Insured Name", "required": True},
        {"name": "inception_date", "display_name": "Inception Date", "required": True},
        {"name": "expiry_date", "display_name": "Expiry Date", "required": True},
        {"name": "gross_premium", "display_name": "Gross Premium", "required": True},
        {"name": "net_premium", "display_name": "Net Premium", "required": False},
        {"name": "broker_commission", "display_name": "Broker Commission", "required": False},
        {"name": "currency", "display_name": "Currency", "required": False},
        {"name": "our_share", "display_name": "Our Share %", "required": False},
        {"name": "sum_insured", "display_name": "Sum Insured", "required": False},
        {"name": "transaction_type", "display_name": "Transaction Type", "required": False},
    ],
    "claims": [
        {"name": "claim_reference", "display_name": "Claim Reference", "required": True},
        {"name": "policy_reference", "display_name": "Policy Reference", "required": True},
        {"name": "insured_name", "display_name": "Insured Name", "required": False},
        {"name": "date_of_loss", "display_name": "Date of Loss", "required": True},
        {"name": "date_notified", "display_name": "Date Notified", "required": False},
        {"name": "paid_this_period", "display_name": "Paid This Period", "required": False},
        {"name": "outstanding_reserve", "display_name": "Outstanding Reserve", "required": False},
        {"name": "total_incurred", "display_name": "Total Incurred", "required": False},
        {"name": "currency", "display_name": "Currency", "required": False},
        {"name": "claim_status", "display_name": "Claim Status", "required": False},
    ]
}

VALIDATION_RULES = [
    {"id": "REQ001", "name": "Required Fields", "severity": "P0", "description": "Check all required fields are present"},
    {"id": "DATE001", "name": "Date Logic", "severity": "P0", "description": "Inception must be before expiry"},
    {"id": "CCY001", "name": "Currency Validation", "severity": "P1", "description": "Currency codes must be valid ISO 4217"},
    {"id": "NUM001", "name": "Negative Premium Check", "severity": "P1", "description": "Negative premiums need cancellation indicator"},
    {"id": "NUM002", "name": "Share Percentage", "severity": "P1", "description": "Share must be between 0-100%"},
    {"id": "DUP001", "name": "Duplicate Detection", "severity": "P1", "description": "Check for duplicate references"},
    {"id": "CALC001", "name": "Premium Calculation", "severity": "P1", "description": "Net = Gross - Commission"},
    {"id": "TYPE001", "name": "Data Type Validation", "severity": "P2", "description": "Values match expected types"},
    {"id": "REC001", "name": "Premium Reconciliation", "severity": "P0", "description": "Sum matches stated total"},
    {"id": "REQ002", "name": "Empty Cell Check", "severity": "P2", "description": "Key columns should not be empty"},
]

@router.get("")
async def list_mappings(run_id: Optional[str] = None, ctx: TenantContext = Depends(get_tenant_context)):
    # For now, return empty - mappings are auto-detected
    return []

@router.get("/schema/canonical")
async def get_canonical_schema(record_type: str = "premium"):
    fields = CANONICAL_FIELDS.get(record_type, CANONICAL_FIELDS["premium"])
    return {"fields": fields, "record_type": record_type}

@router.get("/schema/rules")
async def get_validation_rules():
    return {"rules": VALIDATION_RULES}

@router.post("/bulk-update")
async def bulk_update_mappings(data: dict, ctx: TenantContext = Depends(get_tenant_context)):
    # Placeholder for mapping updates
    return {"updated": 0}
