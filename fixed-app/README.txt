BORDEREAUX EXCEPTION ENGINE - FULL VERSION
===========================================

FEATURES:
- 10 validation rules (REQ001, DATE001, CCY001, NUM001, NUM002, DUP001, CALC001, TYPE001, REC001, REQ002)
- Excel (.xlsx) and CSV file support
- Cell-level issue tracking with references
- Counterparty (MGA) management
- Query pack generation with DOCX/PDF/Markdown export
- Column mapping schema
- PostgreSQL database (data persists)
- Full React/Next.js UI

HOW TO RUN:

1. Open Terminal

2. Go to folder:
   cd ~/Downloads/full-app

3. Start it:
   docker-compose up -d --build

4. Wait 3-5 minutes

5. Set up database:
   docker-compose exec api alembic upgrade head

6. Create demo user:
   docker-compose exec api python scripts/seed_data.py

7. Open Chrome: localhost:3000

8. Login:
   Email: demo@example.com
   Password: demo123


TO STOP:
   docker-compose down


VALIDATION RULES:
- REQ001 (P0): Required fields present
- DATE001 (P0): Inception <= Expiry
- CCY001 (P1): Valid ISO currency codes
- NUM001 (P1): Negative premiums need cancellation
- NUM002 (P1): Share % between 0-100
- DUP001 (P1): No duplicate references
- CALC001 (P1): Net = Gross - Commission
- TYPE001 (P2): Correct data types
- REC001 (P0): Premium totals reconcile
- REQ002 (P2): No empty cells in key columns

