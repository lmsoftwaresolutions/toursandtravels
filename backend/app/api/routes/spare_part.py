from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.spare_part import SparePart
from fastapi import HTTPException


from app.database.session import SessionLocal
from app.schemas.spare_part import SparePartCreate, SparePartResponse
from app.services.spare_part_service import (
    add_spare_part,
    get_all_spare_parts,
    spare_parts_by_vehicle,
    update_spare_part,
    delete_spare_part
)

router = APIRouter(prefix="/spare-parts", tags=["Spare Parts"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=SparePartResponse)
def create_spare(data: SparePartCreate, db: Session = Depends(get_db)):
    return add_spare_part(db, data)


@router.get("/vehicle/{vehicle_number}", response_model=list[SparePartResponse])
def get_spares(vehicle_number: str, db: Session = Depends(get_db)):
    return spare_parts_by_vehicle(db, vehicle_number)


@router.put("/{spare_id}", response_model=SparePartResponse)
def edit_spare(spare_id: int, data: SparePartCreate, db: Session = Depends(get_db)):
    return update_spare_part(db, spare_id, data)


@router.delete("/{spare_id}")
def remove_spare(spare_id: int, db: Session = Depends(get_db)):
    return delete_spare_part(db, spare_id)


@router.get("", response_model=list[SparePartResponse])
def all_spare_parts(db: Session = Depends(get_db)):
    return get_all_spare_parts(db)

@router.get("/{spare_id}", response_model=SparePartResponse)
def get_spare_part(spare_id: int, db: Session = Depends(get_db)):
    spare = db.query(SparePart).filter(SparePart.id == spare_id).first()
    if not spare:
        raise HTTPException(status_code=404, detail="Spare part not found")
    return spare
