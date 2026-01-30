"""Seed the database with demo data"""
import sys
sys.path.insert(0, '/app')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

DATABASE_URL = "postgresql://bordereaux:bordereaux123@db:5432/bordereaux"

def seed():
    from app.db.session import Base
    from app.db.models import Tenant, User, Counterparty
    from app.core.security import get_password_hash
    
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # Check if already seeded
        if db.query(Tenant).filter(Tenant.slug == "demo").first():
            print("Already seeded!")
            return
        
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id, name="Demo Insurance Company", slug="demo",
            is_active=True, settings={"default_currency": "GBP"},
            created_at=datetime.utcnow(), updated_at=datetime.utcnow()
        )
        db.add(tenant)
        
        user = User(
            id=uuid.uuid4(), tenant_id=tenant_id, email="demo@example.com",
            hashed_password=get_password_hash("demo123"), full_name="Demo User",
            is_active=True, is_admin=True, created_at=datetime.utcnow(), updated_at=datetime.utcnow()
        )
        db.add(user)
        
        # Add sample counterparties
        counterparties = [
            {"name": "Alpha MGA Ltd", "code": "ALPHA", "contact_email": "bordereaux@alpha-mga.com"},
            {"name": "Beta Underwriting", "code": "BETA", "contact_email": "data@beta-uw.com"},
            {"name": "Gamma Coverholders", "code": "GAMMA", "contact_email": "submissions@gamma.com"},
        ]
        
        for cp_data in counterparties:
            cp = Counterparty(
                id=uuid.uuid4(), tenant_id=tenant_id, name=cp_data["name"],
                code=cp_data["code"], contact_email=cp_data["contact_email"],
                created_at=datetime.utcnow(), updated_at=datetime.utcnow()
            )
            db.add(cp)
            print(f"  Created counterparty: {cp.name}")
        
        db.commit()
        print("\n✓ Database seeded successfully!")
        print("\nLogin with:")
        print("  Email: demo@example.com")
        print("  Password: demo123")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
