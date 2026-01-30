"""API module - imports all routes"""
from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.issues import router as issues_router
from app.api.routes.counterparties import router as counterparties_router
from app.api.routes.mappings import router as mappings_router
from app.api.routes.query_packs import router as query_packs_router

router = APIRouter()
router.include_router(auth_router, prefix="/auth", tags=["Auth"])
router.include_router(uploads_router, prefix="/uploads", tags=["Uploads"])
router.include_router(issues_router, prefix="/issues", tags=["Issues"])
router.include_router(counterparties_router, prefix="/counterparties", tags=["Counterparties"])
router.include_router(mappings_router, prefix="/mappings", tags=["Mappings"])
router.include_router(query_packs_router, prefix="/query-packs", tags=["Query Packs"])
