from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.schemas.vendor_payment import VendorPaymentCreate, VendorPaymentResponse
from app.services.vendor_payment_service import (
    list_payments_by_vendor,
    create_vendor_payment,
    delete_vendor_payment,
)

router = APIRouter(prefix="/vendor-payments", tags=["Vendor Payments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/vendor/{vendor_id}", response_model=list[VendorPaymentResponse])
def get_vendor_payments(vendor_id: int, db: Session = Depends(get_db)):
    return list_payments_by_vendor(db, vendor_id)


@router.post("", response_model=VendorPaymentResponse)
def add_vendor_payment(data: VendorPaymentCreate, db: Session = Depends(get_db)):
    return create_vendor_payment(db, data)


@router.delete("/{payment_id}")
def remove_vendor_payment(payment_id: int, db: Session = Depends(get_db)):
    deleted = delete_vendor_payment(db, payment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Vendor payment not found")
    return {"message": "Vendor payment deleted"}
