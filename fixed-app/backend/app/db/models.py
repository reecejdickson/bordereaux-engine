"""Database models - only imports Base from session"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class UploadStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class RecordType(str, enum.Enum):
    PREMIUM = "premium"
    CLAIMS = "claims"

class IssueSeverity(str, enum.Enum):
    P0 = "P0"
    P1 = "P1"
    P2 = "P2"

class IssueStatus(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    WONT_FIX = "wont_fix"

class MappingStatus(str, enum.Enum):
    PENDING = "pending"
    AUTO_APPROVED = "auto_approved"
    USER_APPROVED = "user_approved"
    REJECTED = "rejected"

class RunStatus(str, enum.Enum):
    QUEUED = "queued"
    PARSING = "parsing"
    MAPPING = "mapping"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    settings = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    users = relationship("User", back_populates="tenant")
    counterparties = relationship("Counterparty", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tenant = relationship("Tenant", back_populates="users")

class Counterparty(Base):
    __tablename__ = "counterparties"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False)
    contact_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    tenant = relationship("Tenant", back_populates="counterparties")

class Upload(Base):
    __tablename__ = "uploads"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    counterparty_id = Column(UUID(as_uuid=True), ForeignKey("counterparties.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    status = Column(SQLEnum(UploadStatus), default=UploadStatus.PENDING)
    record_type = Column(SQLEnum(RecordType), nullable=True)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    runs = relationship("ProcessingRun", back_populates="upload", cascade="all, delete-orphan")

class ProcessingRun(Base):
    __tablename__ = "processing_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_id = Column(UUID(as_uuid=True), ForeignKey("uploads.id", ondelete="CASCADE"), nullable=False)
    run_number = Column(Integer, nullable=False)
    status = Column(SQLEnum(RunStatus), default=RunStatus.QUEUED)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    total_rows = Column(Integer, default=0)
    issues_p0 = Column(Integer, default=0)
    issues_p1 = Column(Integer, default=0)
    issues_p2 = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    upload = relationship("Upload", back_populates="runs")
    issues = relationship("Issue", back_populates="run", cascade="all, delete-orphan")

class Issue(Base):
    __tablename__ = "issues"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("processing_runs.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(String(50), nullable=False)
    severity = Column(SQLEnum(IssueSeverity), nullable=False)
    status = Column(SQLEnum(IssueStatus), default=IssueStatus.OPEN)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    cell_reference = Column(String(50), nullable=True)
    actual_value = Column(Text, nullable=True)
    expected_value = Column(Text, nullable=True)
    row_index = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    run = relationship("ProcessingRun", back_populates="issues")
