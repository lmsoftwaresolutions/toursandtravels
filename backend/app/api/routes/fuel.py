from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.fuel import FuelCreate, FuelResponse
from app.services.fuel_service import add_fuel, fuel_history_by_vehicle, get_all_fuel, get_fuel_by_id, update_fuel
from app.models.fuel import Fuel

router = APIRouter(prefix="/fuel", tags=["Fuel"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=FuelResponse)
def create_fuel(data: FuelCreate, db: Session = Depends(get_db)):
    return add_fuel(db, data)

@router.get("/vehicle/{vehicle_number}", response_model=list[FuelResponse])
def fuel_history(vehicle_number: str, db: Session = Depends(get_db)):
    return fuel_history_by_vehicle(db, vehicle_number)


@router.get("", response_model=list[FuelResponse])
def all_fuel(db: Session = Depends(get_db)):
    return get_all_fuel(db)



@router.delete("/{fuel_id}")
def delete_fuel(
    fuel_id: int,
    db: Session = Depends(get_db)
):
    fuel = db.query(Fuel).filter(Fuel.id == fuel_id).first()
    if not fuel:
        raise HTTPException(status_code=404, detail="Fuel not found")

    db.delete(fuel)
    db.commit()
    return {"message": "Fuel deleted"}

@router.get("/{fuel_id}", response_model=FuelResponse)
def get_single_fuel(fuel_id: int, db: Session = Depends(get_db)):
    fuel = get_fuel_by_id(db, fuel_id)
    if not fuel:
        raise HTTPException(status_code=404, detail="Fuel not found")
    return fuel

@router.put("/{fuel_id}", response_model=FuelResponse)
def edit_fuel(fuel_id: int, data: FuelCreate, db: Session = Depends(get_db)):
    fuel = update_fuel(db, fuel_id, data)
    if not fuel:
        raise HTTPException(status_code=404, detail="Fuel not found")
    return fuel