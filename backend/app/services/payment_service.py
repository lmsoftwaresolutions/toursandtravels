from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.models.trip import Trip
from app.schemas.payment import PaymentCreate

def create_payment(db: Session, payment: PaymentCreate):
    # Create payment record
    db_payment = Payment(**payment.dict())
    db.add(db_payment)
    db.flush()

    # Update trip's amount_received and pending_amount
    trip = db.query(Trip).filter(Trip.id == payment.trip_id).first()
    if trip:
        trip.amount_received = (trip.amount_received or 0) + payment.amount
        trip.calculate_pending_amount()  # Recalculate pending_amount

    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payments_by_trip(db: Session, trip_id: int):
    return db.query(Payment).filter(Payment.trip_id == trip_id).order_by(Payment.payment_date.desc()).all()

def get_all_payments(db: Session):
    return db.query(Payment).order_by(Payment.payment_date.desc()).all()

def delete_payment(db: Session, payment_id: int):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if payment:
        # Reverse the amount from trip
        trip = db.query(Trip).filter(Trip.id == payment.trip_id).first()
        if trip:
            trip.amount_received = max(0, (trip.amount_received or 0) - payment.amount)
            trip.calculate_pending_amount()  # Recalculate pending_amount

        db.delete(payment)
        db.commit()
    return payment
