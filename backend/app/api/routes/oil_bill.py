from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.oil_bill import OilBillCreate, OilBillListResponse, OilBillResponse
from app.services.auth_service import require_write_access
from app.services.oil_bill_service import (
    create_oil_bill,
    delete_oil_bill,
    get_oil_bill,
    list_oil_bills,
    update_oil_bill,
)

router = APIRouter(prefix="/oil-bills", tags=["Oil Bills"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=OilBillResponse)
def create_oil_bill_entry(data: OilBillCreate, db: Session = Depends(get_db)):
    return create_oil_bill(db, data)


@router.get("", response_model=list[OilBillListResponse])
def get_oil_bills(vendor_id: int | None = Query(None), db: Session = Depends(get_db)):
    return list_oil_bills(db, vendor_id=vendor_id)


@router.get("/{bill_id}", response_model=OilBillResponse)
def get_single_oil_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = get_oil_bill(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Oil bill not found")
    return bill


@router.put("/{bill_id}", response_model=OilBillResponse)
def edit_oil_bill(
    bill_id: int,
    data: OilBillCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_access),
):
    bill = update_oil_bill(db, bill_id, data)
    if not bill:
        raise HTTPException(status_code=404, detail="Oil bill not found")
    return bill


@router.delete("/{bill_id}")
def remove_oil_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_access),
):
    bill = delete_oil_bill(db, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Oil bill not found")
    return {"message": "Oil bill deleted"}
