from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy.sql import func
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate


def normalize_vehicle_number(value: str | None) -> str:
    return str(value or "").upper().replace(" ", "").replace("-", "")


# ---------------- CREATE ----------------
def create_vehicle(db: Session, vehicle: VehicleCreate):
    normalized_number = normalize_vehicle_number(vehicle.vehicle_number)
    existing = (
        db.query(Vehicle)
        .filter(
            func.lower(Vehicle.vehicle_number) == func.lower(normalized_number),
            Vehicle.is_deleted == False
        )
        .first()
    )

    if existing:
        raise HTTPException(400, "Vehicle already exists")

    db_vehicle = Vehicle(
        vehicle_number=normalized_number,
        vehicle_type=vehicle.vehicle_type,
        seat_count=vehicle.seat_count,
    )

    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


# ---------------- READ ALL ----------------
def get_all_vehicles(db: Session):
    return (
        db.query(Vehicle)
        .filter(Vehicle.is_deleted == False)
        .order_by(Vehicle.created_at.desc())
        .all()
    )


# ---------------- READ ONE ----------------
def get_vehicle_by_number(db: Session, vehicle_number: str):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.vehicle_number == vehicle_number,
            Vehicle.is_deleted == False
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    return vehicle


# ---------------- SOFT DELETE ----------------
def soft_delete_vehicle(db: Session, vehicle_id: int):
    vehicle = (
        db.query(Vehicle)
        .filter(
            Vehicle.id == vehicle_id,
            Vehicle.is_deleted == False
        )
        .first()
    )

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    vehicle.is_deleted = True
    vehicle.deleted_at = func.now()

    db.commit()
    return {"message": "Vehicle deleted successfully"}
