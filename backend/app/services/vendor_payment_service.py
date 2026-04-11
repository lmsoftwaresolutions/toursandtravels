from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.vendor_payment import VendorPayment
from app.models.trip import Trip
from app.schemas.vendor_payment import VendorPaymentCreate


def list_payments_by_vendor(db: Session, vendor_id: int):
    return (
        db.query(VendorPayment)
        .filter(VendorPayment.vendor_id == vendor_id)
        .order_by(VendorPayment.paid_on.desc())
        .all()
    )


def create_vendor_payment(db: Session, data: VendorPaymentCreate):
    trip = db.query(Trip).filter(Trip.id == data.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    payment = VendorPayment(**data.dict())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def delete_vendor_payment(db: Session, payment_id: int):
    payment = db.query(VendorPayment).filter(VendorPayment.id == payment_id).first()
    if payment:
        db.delete(payment)
        db.commit()
    return payment
