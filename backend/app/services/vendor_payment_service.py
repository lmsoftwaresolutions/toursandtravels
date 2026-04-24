from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.vendor_payment import VendorPayment
from app.models.trip import Trip
from app.models.vendor import Vendor
from app.models.fuel import Fuel
from app.models.mechanic import MechanicEntry
from app.models.spare_part import SparePart
from app.models.trip_vehicle import TripVehicle
from app.schemas.vendor_payment import VendorPaymentCreate


def list_payments_by_vendor(db: Session, vendor_id: int):
    return (
        db.query(VendorPayment)
        .filter(VendorPayment.vendor_id == vendor_id)
        .order_by(VendorPayment.paid_on.desc())
        .all()
    )

def list_all_payments(db: Session):
    return (
        db.query(VendorPayment)
        .order_by(VendorPayment.paid_on.desc(), VendorPayment.id.desc())
        .all()
    )


def create_vendor_payment(db: Session, data: VendorPaymentCreate):
    if (data.amount or 0) <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    vendor = db.query(Vendor).filter(Vendor.id == data.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if data.trip_id is not None:
        trip = db.query(Trip).filter(Trip.id == data.trip_id).first()
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

    normalized_name = (vendor.name or "").strip().lower()

    fuel_total = (
        db.query(func.coalesce(func.sum(Fuel.total_cost), 0.0))
        .filter(func.lower(func.trim(Fuel.vendor)) == normalized_name)
        .scalar()
    )
    spare_total = (
        db.query(func.coalesce(func.sum(SparePart.cost * SparePart.quantity), 0.0))
        .filter(func.lower(func.trim(SparePart.vendor)) == normalized_name)
        .scalar()
    )
    mechanic_total = (
        db.query(func.coalesce(func.sum(MechanicEntry.cost), 0.0))
        .filter(func.lower(func.trim(MechanicEntry.vendor)) == normalized_name)
        .scalar()
    )
    trip_vehicle_total = (
        db.query(func.coalesce(func.sum(TripVehicle.fuel_cost), 0.0))
        .filter(func.lower(func.trim(TripVehicle.fuel_vendor)) == normalized_name)
        .scalar()
    )
    matching_trip_ids = (
        db.query(TripVehicle.trip_id)
        .filter(func.lower(func.trim(TripVehicle.fuel_vendor)) == normalized_name)
        .distinct()
        .subquery()
    )
    trip_no_vehicle_total = (
        db.query(func.coalesce(func.sum(Trip.diesel_used + Trip.petrol_used), 0.0))
        .filter(func.lower(func.trim(Trip.vendor)) == normalized_name)
        .filter(~Trip.id.in_(matching_trip_ids))
        .scalar()
    )
    paid_total = (
        db.query(func.coalesce(func.sum(VendorPayment.amount), 0.0))
        .filter(VendorPayment.vendor_id == data.vendor_id)
        .scalar()
    )

    total_owed = (
        float(fuel_total or 0)
        + float(spare_total or 0)
        + float(mechanic_total or 0)
        + float(trip_vehicle_total or 0)
        + float(trip_no_vehicle_total or 0)
    )
    pending_amount = max(total_owed - float(paid_total or 0), 0)
    if float(data.amount or 0) > pending_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds pending amount. Pending is {pending_amount:.2f}",
        )

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
