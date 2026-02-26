from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.vendor import VendorCreate, VendorResponse
from app.services.vendor_service import add_vendor, list_vendors
from app.services.vendor_stats_service import vendor_summary

router = APIRouter(prefix="/vendors", tags=["Vendors"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=VendorResponse)
def create_vendor(data: VendorCreate, db: Session = Depends(get_db)):
    return add_vendor(db, data)


@router.get("", response_model=list[VendorResponse])
def get_vendors(category: str | None = Query(None), db: Session = Depends(get_db)):
    return list_vendors(db, category)


@router.get("/{vendor_id}/summary")
def get_vendor_summary(vendor_id: int, db: Session = Depends(get_db)):
    summary = vendor_summary(db, vendor_id)
    return summary or {"error": "Vendor not found"}
