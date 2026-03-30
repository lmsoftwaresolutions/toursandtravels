from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.session import SessionLocal
from app.models.quotation import Quotation
from app.schemas.quotation import QuotationCreate, QuotationResponse, QuotationUpdate
from app.services.auth_service import get_current_user, require_write_access

router = APIRouter(
    prefix="/quotations",
    tags=["Quotations"]
)

# ---------------- DB DEPENDENCY ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- CREATE QUOTATION ----------------
@router.post("", response_model=QuotationResponse)
def create_quotation(quotation: QuotationCreate, db: Session = Depends(get_db)):
    db_quotation = Quotation(**quotation.model_dump())
    db.add(db_quotation)
    db.commit()
    db.refresh(db_quotation)
    return db_quotation

# ---------------- GET ALL QUOTATIONS ----------------
@router.get("", response_model=List[QuotationResponse])
def get_all_quotations(db: Session = Depends(get_db)):
    return db.query(Quotation).filter(Quotation.is_deleted == False).order_by(Quotation.created_at.desc()).all()

# ---------------- GET SINGLE QUOTATION ----------------
@router.get("/{id}", response_model=QuotationResponse)
def get_quotation(id: int, db: Session = Depends(get_db)):
    quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.is_deleted == False).first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

# ---------------- UPDATE QUOTATION ----------------
@router.put("/{id}", response_model=QuotationResponse)
def update_quotation(
    id: int,
    quotation_data: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_access),
):
    db_quotation = db.query(Quotation).filter(Quotation.id == id, Quotation.is_deleted == False).first()
    if not db_quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    for key, value in quotation_data.model_dump().items():
        setattr(db_quotation, key, value)
    
    db.commit()
    db.refresh(db_quotation)
    return db_quotation

# ---------------- DELETE QUOTATION ----------------
@router.delete("/{id}")
def delete_quotation(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete quotations")
    
    db_quotation = db.query(Quotation).filter(Quotation.id == id).first()
    if not db_quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    # Soft delete
    db_quotation.is_deleted = True
    db.commit()
    return {"message": "Quotation deleted successfully"}
