from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.models.oil_bill import OilBill, OilBillEntry
from app.models.vehicle import Vehicle
from app.models.vendor import Vendor
from app.schemas.oil_bill import OilBillCreate

ALLOWED_PAYMENT_STATUS = {"paid", "unpaid", "partial"}


def _normalize_payment_status(value: str | None) -> str:
    normalized = str(value or "unpaid").strip().lower()
    if normalized not in ALLOWED_PAYMENT_STATUS:
        raise HTTPException(status_code=400, detail="Invalid payment status")
    return normalized


def _validate_vendor(db: Session, vendor_id: int) -> Vendor:
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    category = str(vendor.category or "").strip().lower()
    if category != "oil":
        raise HTTPException(status_code=400, detail="Vendor must be in Oil category")
    return vendor


def _validate_vehicle(db: Session, vehicle_number: str) -> None:
    normalized = str(vehicle_number or "").strip().lower()
    exists = (
        db.query(Vehicle.id)
        .filter(
            Vehicle.is_deleted == False,
            Vehicle.vehicle_number.isnot(None),
            Vehicle.vehicle_number != "",
            Vehicle.vehicle_number.ilike(normalized),
        )
        .first()
    )
    if not exists:
        raise HTTPException(status_code=404, detail=f"Vehicle not found: {vehicle_number}")


def _validate_bill_payload(db: Session, payload: OilBillCreate, bill_id: Optional[int] = None) -> tuple[Vendor, str]:
    vendor = _validate_vendor(db, payload.vendor_id)

    bill_number = str(payload.bill_number or "").strip()
    if not bill_number:
        raise HTTPException(status_code=400, detail="Bill number is required")

    if not payload.entries:
        raise HTTPException(status_code=400, detail="At least one vehicle entry is required")

    duplicate = (
        db.query(OilBill)
        .filter(
            OilBill.vendor_id == payload.vendor_id,
            OilBill.bill_number == bill_number,
            OilBill.id != (bill_id or 0),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Bill number already exists for this vendor")

    for entry in payload.entries:
        _validate_vehicle(db, entry.vehicle_number)
        if (entry.liters or 0) <= 0:
            raise HTTPException(status_code=400, detail="Liters must be greater than zero")
        if (entry.rate or 0) <= 0:
            raise HTTPException(status_code=400, detail="Rate must be greater than zero")

    return vendor, bill_number


def _build_bill_response(bill: OilBill, vendor_name: str):
    entries_sorted = sorted(list(bill.entries or []), key=lambda item: item.row_order)
    distinct_vehicles = len({(entry.vehicle_number or "").strip().lower() for entry in entries_sorted if entry.vehicle_number})

    return {
        "id": bill.id,
        "vendor_id": bill.vendor_id,
        "vendor_name": vendor_name,
        "bill_number": bill.bill_number,
        "bill_date": bill.bill_date,
        "payment_status": bill.payment_status,
        "payment_mode": bill.payment_mode,
        "overall_note": bill.overall_note,
        "grand_total_amount": float(bill.grand_total_amount or 0),
        "total_vehicles": distinct_vehicles,
        "entries": entries_sorted,
        "created_at": bill.created_at,
        "updated_at": bill.updated_at,
    }


def create_oil_bill(db: Session, payload: OilBillCreate):
    vendor, bill_number = _validate_bill_payload(db, payload)
    payment_status = _normalize_payment_status(payload.payment_status)

    grand_total = 0.0
    entry_rows: list[OilBillEntry] = []
    for index, entry in enumerate(payload.entries):
        total_amount = float(entry.liters or 0) * float(entry.rate or 0)
        grand_total += total_amount
        entry_rows.append(
            OilBillEntry(
                vehicle_number=entry.vehicle_number,
                particular_name=(entry.particular_name or "").strip(),
                liters=float(entry.liters or 0),
                rate=float(entry.rate or 0),
                total_amount=total_amount,
                note=(entry.note or "").strip() or None,
                row_order=index,
            )
        )

    bill = OilBill(
        vendor_id=payload.vendor_id,
        bill_number=bill_number,
        bill_date=payload.bill_date,
        payment_status=payment_status,
        payment_mode=(payload.payment_mode or "").strip() or None,
        overall_note=(payload.overall_note or "").strip() or None,
        grand_total_amount=grand_total,
        entries=entry_rows,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    bill = (
        db.query(OilBill)
        .options(joinedload(OilBill.entries))
        .filter(OilBill.id == bill.id)
        .first()
    )
    return _build_bill_response(bill, vendor.name)


def list_oil_bills(db: Session, vendor_id: int | None = None):
    query = (
        db.query(OilBill, Vendor.name.label("vendor_name"))
        .join(Vendor, Vendor.id == OilBill.vendor_id)
        .options(joinedload(OilBill.entries))
        .order_by(OilBill.bill_date.desc(), OilBill.id.desc())
    )
    if vendor_id:
        query = query.filter(OilBill.vendor_id == vendor_id)

    rows = query.all()
    result = []
    for bill, vendor_name in rows:
        response = _build_bill_response(bill, vendor_name)
        result.append(
            {
                "id": response["id"],
                "vendor_id": response["vendor_id"],
                "vendor_name": response["vendor_name"],
                "bill_number": response["bill_number"],
                "bill_date": response["bill_date"],
                "payment_status": response["payment_status"],
                "grand_total_amount": response["grand_total_amount"],
                "total_vehicles": response["total_vehicles"],
                "entries": response["entries"],
            }
        )
    return result


def get_oil_bill(db: Session, bill_id: int):
    row = (
        db.query(OilBill, Vendor.name.label("vendor_name"))
        .join(Vendor, Vendor.id == OilBill.vendor_id)
        .options(joinedload(OilBill.entries))
        .filter(OilBill.id == bill_id)
        .first()
    )
    if not row:
        return None
    bill, vendor_name = row
    return _build_bill_response(bill, vendor_name)


def update_oil_bill(db: Session, bill_id: int, payload: OilBillCreate):
    bill = db.query(OilBill).options(joinedload(OilBill.entries)).filter(OilBill.id == bill_id).first()
    if not bill:
        return None

    vendor, bill_number = _validate_bill_payload(db, payload, bill_id=bill_id)
    payment_status = _normalize_payment_status(payload.payment_status)

    grand_total = 0.0
    new_entries: list[OilBillEntry] = []
    for index, entry in enumerate(payload.entries):
        total_amount = float(entry.liters or 0) * float(entry.rate or 0)
        grand_total += total_amount
        new_entries.append(
            OilBillEntry(
                vehicle_number=entry.vehicle_number,
                particular_name=(entry.particular_name or "").strip(),
                liters=float(entry.liters or 0),
                rate=float(entry.rate or 0),
                total_amount=total_amount,
                note=(entry.note or "").strip() or None,
                row_order=index,
            )
        )

    bill.vendor_id = payload.vendor_id
    bill.bill_number = bill_number
    bill.bill_date = payload.bill_date
    bill.payment_status = payment_status
    bill.payment_mode = (payload.payment_mode or "").strip() or None
    bill.overall_note = (payload.overall_note or "").strip() or None
    bill.grand_total_amount = grand_total
    bill.entries = new_entries

    db.commit()
    db.refresh(bill)
    return _build_bill_response(bill, vendor.name)


def delete_oil_bill(db: Session, bill_id: int):
    bill = db.query(OilBill).filter(OilBill.id == bill_id).first()
    if not bill:
        return None
    db.delete(bill)
    db.commit()
    return bill
