from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleResponse
from app.services.vehicle_service import (
    create_vehicle,
    get_all_vehicles,
    get_vehicle_by_number,
    soft_delete_vehicle
)

from app.services.vehicle_stats_service import vehicle_summary

router = APIRouter(
    prefix="/vehicles",
    tags=["Vehicles"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=VehicleResponse)
def add_vehicle(vehicle: VehicleCreate, db: Session = Depends(get_db)):
    result = create_vehicle(db, vehicle)
    if not result:
        raise HTTPException(status_code=400, detail="Vehicle already exists")
    return result


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    return get_all_vehicles(db)


@router.get("/{vehicle_number}", response_model=VehicleResponse)
def vehicle_details(vehicle_number: str, db: Session = Depends(get_db)):
    vehicle = get_vehicle_by_number(db, vehicle_number)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


# ✅ FIXED: trailing slash added
@router.get("/{vehicle_number}/summary")
def get_vehicle_summary(vehicle_number: str, db: Session = Depends(get_db)):
    return vehicle_summary(db, vehicle_number)


@router.delete("/{vehicle_id}")
def remove_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    return soft_delete_vehicle(db, vehicle_id)



@router.put("/{vehicle_number}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_number: str,
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == vehicle_number
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    db.commit()
    db.refresh(vehicle)
    return vehicle
