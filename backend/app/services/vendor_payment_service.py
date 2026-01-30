from sqlalchemy.orm import Session
from app.models.vendor_payment import VendorPayment
from app.schemas.vendor_payment import VendorPaymentCreate


def list_payments_by_vendor(db: Session, vendor_id: int):
    return (
        db.query(VendorPayment)
        .filter(VendorPayment.vendor_id == vendor_id)
        .order_by(VendorPayment.paid_on.desc())
        .all()
    )


def create_vendor_payment(db: Session, data: VendorPaymentCreate):
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
