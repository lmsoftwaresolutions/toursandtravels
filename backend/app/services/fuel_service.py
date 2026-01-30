from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.fuel import Fuel
from app.models.vehicle import Vehicle
from app.schemas.fuel import FuelCreate

def add_fuel(db: Session, data: FuelCreate):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == data.vehicle_number
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    total_cost = data.quantity * data.rate_per_litre

    fuel = Fuel(
        vehicle_number=data.vehicle_number,
        fuel_type=data.fuel_type,
        quantity=data.quantity,
        rate_per_litre=data.rate_per_litre,
        total_cost=total_cost,
        filled_date=data.filled_date,
        vendor=data.vendor
    )

    db.add(fuel)
    db.commit()
    db.refresh(fuel)
    return fuel


def fuel_history_by_vehicle(db: Session, vehicle_number: str):
    return db.query(Fuel).filter(
        Fuel.vehicle_number == vehicle_number
    ).order_by(Fuel.filled_date.desc()).all()




def get_all_fuel(db: Session):
    return (
        db.query(Fuel)
        .order_by(Fuel.filled_date.desc())  # ✅ FIXED
        .all()
    )



def get_fuel_by_id(db: Session, fuel_id: int):
    return db.query(Fuel).filter(Fuel.id == fuel_id).first()

def update_fuel(db: Session, fuel_id: int, data):
    fuel = get_fuel_by_id(db, fuel_id)
    if not fuel:
        return None

    fuel.vehicle_number = data.vehicle_number
    fuel.fuel_type = data.fuel_type
    fuel.quantity = data.quantity
    fuel.rate_per_litre = data.rate_per_litre
    fuel.total_cost = data.quantity * data.rate_per_litre
    fuel.filled_date = data.filled_date
    fuel.vendor = data.vendor

    db.commit()
    db.refresh(fuel)
    return fuel