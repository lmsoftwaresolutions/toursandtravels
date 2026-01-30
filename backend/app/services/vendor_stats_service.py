from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.vendor import Vendor
from app.models.fuel import Fuel
from app.models.spare_part import SparePart
from app.models.vendor_payment import VendorPayment


def vendor_summary(db: Session, vendor_id: int):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        return None

    name = vendor.name

    fuel_total = (
        db.query(func.coalesce(func.sum(Fuel.total_cost), 0.0))
        .filter(Fuel.vendor == name)
        .scalar()
    )

    spare_total = (
        db.query(func.coalesce(func.sum(SparePart.cost * SparePart.quantity), 0.0))
        .filter(SparePart.vendor == name)
        .scalar()
    )

    paid_total = (
        db.query(func.coalesce(func.sum(VendorPayment.amount), 0.0))
        .filter(VendorPayment.vendor_id == vendor_id)
        .scalar()
    )

    total_owed = float(fuel_total or 0) + float(spare_total or 0)
    pending = total_owed - float(paid_total or 0)

    return {
        "vendor_id": vendor_id,
        "vendor_name": name,
        "fuel_total": float(fuel_total or 0),
        "spare_total": float(spare_total or 0),
        "total_owed": total_owed,
        "paid_total": float(paid_total or 0),
        "pending": pending,
    }
