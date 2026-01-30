from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate


ALLOWED_BOTH = "both"


def add_vendor(db: Session, data: VendorCreate):
    existing = db.query(Vendor).filter(Vendor.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vendor already exists")

    vendor = Vendor(name=data.name, category=data.category)
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def list_vendors(db: Session, category: str | None = None):
    query = db.query(Vendor)
    if category:
        query = query.filter(
            or_(
                Vendor.category == None,  # noqa: E711 - allow vendors without category
                Vendor.category == category,
                Vendor.category == ALLOWED_BOTH,
            )
        )
    return query.order_by(Vendor.name.asc()).all()
