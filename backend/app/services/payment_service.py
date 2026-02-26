from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.models.trip import Trip
from app.schemas.payment import PaymentCreate
from fastapi import HTTPException


def create_payment(db: Session, payment: PaymentCreate):
    # 1️⃣ Fetch trip
    trip = db.query(Trip).filter(Trip.id == payment.trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # 2️⃣ Calculate balances
    received = trip.amount_received or 0
    remaining = (trip.total_charged or 0) - received

    # 3️⃣ Prevent overpayment
    if payment.amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds remaining balance (₹{remaining})"
        )

    # 4️⃣ CREATE PAYMENT (invoice comes from Trip 🔥)
    db_payment = Payment(
        invoice_number=trip.invoice_number,   # ✅ SINGLE SOURCE OF TRUTH
        trip_id=payment.trip_id,
        payment_date=payment.payment_date,
        payment_mode=payment.payment_mode,
        amount=payment.amount,
        notes=payment.notes
    )

    db.add(db_payment)
    db.flush()

    # 5️⃣ Update trip amounts
    trip.amount_received = received + payment.amount
    trip.pending_amount = (trip.total_charged or 0) - trip.amount_received

    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payments_by_trip(db: Session, trip_id: int):
    return (
        db.query(Payment)
        .filter(Payment.trip_id == trip_id)
        .order_by(Payment.payment_date.desc())
        .all()
    )


def get_all_payments(db: Session):
    return (
        db.query(Payment)
        .order_by(Payment.payment_date.desc())
        .all()
    )


def delete_payment(db: Session, payment_id: int):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        return None

    trip = db.query(Trip).filter(Trip.id == payment.trip_id).first()
    if trip:
        trip.amount_received = max(
            0, (trip.amount_received or 0) - payment.amount
        )
        trip.calculate_pending_amount()

    db.delete(payment)
    db.commit()
    return payment
