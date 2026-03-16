from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.mechanic import MechanicCreate, MechanicResponse
from app.services.mechanic_service import (
    add_mechanic_entry,
    get_all_mechanic_entries,
    get_mechanic_by_vehicle,
    get_mechanic_by_id,
    update_mechanic_entry,
    delete_mechanic_entry,
)

router = APIRouter(prefix="/mechanic", tags=["Mechanic"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=MechanicResponse)
def create_mechanic_entry(data: MechanicCreate, db: Session = Depends(get_db)):
    return add_mechanic_entry(db, data)


@router.get("", response_model=list[MechanicResponse])
def list_mechanic_entries(db: Session = Depends(get_db)):
    return get_all_mechanic_entries(db)


@router.get("/vehicle/{vehicle_number}", response_model=list[MechanicResponse])
def mechanic_history(vehicle_number: str, db: Session = Depends(get_db)):
    return get_mechanic_by_vehicle(db, vehicle_number)


@router.get("/{entry_id}", response_model=MechanicResponse)
def get_mechanic_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = get_mechanic_by_id(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Mechanic entry not found")
    return entry


@router.put("/{entry_id}", response_model=MechanicResponse)
def edit_mechanic_entry(entry_id: int, data: MechanicCreate, db: Session = Depends(get_db)):
    entry = update_mechanic_entry(db, entry_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="Mechanic entry not found")
    return entry


@router.delete("/{entry_id}")
def remove_mechanic_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = delete_mechanic_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Mechanic entry not found")
    return {"message": "Mechanic entry deleted"}
