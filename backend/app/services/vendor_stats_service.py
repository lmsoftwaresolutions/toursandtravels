from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.vendor import Vendor
from app.models.fuel import Fuel
from app.models.mechanic import MechanicEntry
from app.models.oil_bill import OilBill, OilBillEntry
from app.models.spare_part import SparePart
from app.models.trip import Trip
from app.models.trip_vehicle import TripVehicle
from app.models.vendor_payment import VendorPayment


def vendor_summary(db: Session, vendor_id: int):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        return None

    name = vendor.name or ""
    normalized_name = name.strip().lower()

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

    # Trip fuel total should mirror UI logic:
    # 1) Prefer per-vehicle fuel_cost where fuel_vendor matches this vendor
    # 2) Otherwise fall back to trip-level diesel+petrol totals when Trip.vendor matches
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

    trip_fuel_total = float(trip_vehicle_total or 0) + float(trip_no_vehicle_total or 0)

    mechanic_total = (
        db.query(func.coalesce(func.sum(MechanicEntry.cost), 0.0))
        .filter(func.lower(func.trim(MechanicEntry.vendor)) == normalized_name)
        .scalar()
    )

    oil_total = (
        db.query(func.coalesce(func.sum(OilBillEntry.total_amount), 0.0))
        .join(OilBill, OilBill.id == OilBillEntry.oil_bill_id)
        .filter(OilBill.vendor_id == vendor_id)
        .scalar()
    )

    paid_total = (
        db.query(func.coalesce(func.sum(VendorPayment.amount), 0.0))
        .filter(VendorPayment.vendor_id == vendor_id)
        .scalar()
    )

    total_owed = (
        float(fuel_total or 0) +
        float(trip_fuel_total or 0) +
        float(spare_total or 0) +
        float(mechanic_total or 0) +
        float(oil_total or 0)
    )
    pending = max(total_owed - float(paid_total or 0), 0)

    return {
        "vendor_id": vendor_id,
        "vendor_name": name,
        "fuel_total": float(fuel_total or 0),
        "trip_fuel_total": float(trip_fuel_total or 0),
        "spare_total": float(spare_total or 0),
        "mechanic_total": float(mechanic_total or 0),
        "oil_total": float(oil_total or 0),
        "total_owed": total_owed,
        "paid_total": float(paid_total or 0),
        "pending": pending,
    }
