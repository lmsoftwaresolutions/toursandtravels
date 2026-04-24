from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.database.session import SessionLocal
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate
from app.services.vehicle_service import (
    create_vehicle,
    get_all_vehicles,
    get_vehicle_by_number,
    soft_delete_vehicle,
    normalize_vehicle_number
)

from app.services.vehicle_stats_service import vehicle_summary
from app.services.auth_service import require_write_access

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
    vehicle = get_vehicle_by_number(db, normalize_vehicle_number(vehicle_number))
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


# ✅ FIXED: trailing slash added
@router.get("/{vehicle_number}/summary")
def get_vehicle_summary(vehicle_number: str, db: Session = Depends(get_db)):
    return vehicle_summary(db, normalize_vehicle_number(vehicle_number))


@router.delete("/{vehicle_id}")
def remove_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_access),
):
    return soft_delete_vehicle(db, vehicle_id)



@router.put("/{vehicle_number}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_number: str,
    update_data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_write_access),
):
    normalized_current = normalize_vehicle_number(vehicle_number)
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == normalized_current
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    new_number = normalize_vehicle_number(update_data.vehicle_number)

    if new_number != normalized_current:
        # Check if new number already exists
        existing = db.query(Vehicle).filter(
            func.lower(Vehicle.vehicle_number) == func.lower(new_number)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="New vehicle number already exists")

        # Update all related tables manually if not using ON UPDATE CASCADE
        from app.models.trip import Trip
        from app.models.fuel import Fuel
        from app.models.maintenance import Maintenance
        from app.models.vehicle_emi import VehicleEMIPlan
        from app.models.vehicle_insurance import VehicleInsurance
        from app.models.vehicle_tax import VehicleTax

        db.query(Trip).filter(Trip.vehicle_number == normalized_current).update({"vehicle_number": new_number})
        db.query(Fuel).filter(Fuel.vehicle_number == normalized_current).update({"vehicle_number": new_number})
        db.query(Maintenance).filter(Maintenance.vehicle_number == normalized_current).update({"vehicle_number": new_number})
        db.query(VehicleEMIPlan).filter(VehicleEMIPlan.vehicle_number == normalized_current).update({"vehicle_number": new_number})
        db.query(VehicleInsurance).filter(VehicleInsurance.vehicle_number == normalized_current).update({"vehicle_number": new_number})
        db.query(VehicleTax).filter(VehicleTax.vehicle_number == normalized_current).update({"vehicle_number": new_number})

        vehicle.vehicle_number = new_number

    if update_data.vehicle_type is not None:
        vehicle.vehicle_type = update_data.vehicle_type

    if update_data.seat_count is not None:
        vehicle.seat_count = update_data.seat_count

    db.commit()
    db.refresh(vehicle)
    return vehicle
