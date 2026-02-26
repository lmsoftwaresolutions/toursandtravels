from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import (
    create_payment,
    get_payments_by_trip,
    get_all_payments,
    delete_payment
)

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=PaymentResponse)
def add_payment(payment: PaymentCreate, db: Session = Depends(get_db)):
    return create_payment(db, payment)

@router.get("", response_model=list[PaymentResponse])
def get_payments(db: Session = Depends(get_db)):
    return get_all_payments(db)

@router.get("/trip/{trip_id}", response_model=list[PaymentResponse])
def get_trip_payments(trip_id: int, db: Session = Depends(get_db)):
    return get_payments_by_trip(db, trip_id)

@router.delete("/{payment_id}")
def remove_payment(payment_id: int, db: Session = Depends(get_db)):
    payment = delete_payment(db, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted successfully"}
