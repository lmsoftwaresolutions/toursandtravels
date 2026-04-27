from enum import Enum
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.vendor import Vendor
from app.models.oil_bill import OilBill
from app.models.vendor_payment import VendorPayment
from app.schemas.vendor import VendorCreate

ALLOWED_CATEGORIES = {"fuel", "spare_parts", "mechanic", "oil"}

CATEGORY_ALIASES = {
    "spare": "spare_parts",
    "spare_parts": "spare_parts",
    "fuel": "fuel",
    "mechanic": "mechanic",
    "oil": "oil",
}


def _normalize_category(category: str | None):
    if not category:
        return None
    raw_value = category.value if isinstance(category, Enum) else category
    normalized = CATEGORY_ALIASES.get(str(raw_value).strip().lower(), str(raw_value).strip().lower())
    if not normalized:
        return None
    if normalized not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid vendor category")
    return normalized


def add_vendor(db: Session, data: VendorCreate):
    existing = db.query(Vendor).filter(Vendor.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor already exists")

    vendor = Vendor(
        name=data.name.strip(),
        phone=(data.phone or "").strip() or None,
        category=_normalize_category(data.category),
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def list_vendors(db: Session, category: str | None = None):
    query = db.query(Vendor)
    if category:
        query = query.filter(Vendor.category == _normalize_category(category))
    return query.order_by(Vendor.name.asc()).all()


def delete_vendor(db: Session, vendor_id: int):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.query(VendorPayment).filter(VendorPayment.vendor_id == vendor_id).delete(
        synchronize_session=False
    )
    db.query(OilBill).filter(OilBill.vendor_id == vendor_id).delete(
        synchronize_session=False
    )
    db.delete(vendor)
    db.commit()
    return vendor
