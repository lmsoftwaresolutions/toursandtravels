from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.spare_part import SparePart
from app.models.vehicle import Vehicle


# ---------------- ADD ----------------
def add_spare_part(db: Session, data):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == data.vehicle_number
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    spare = SparePart(**data.dict())
    db.add(spare)

    vehicle.total_maintenance_cost += data.cost * data.quantity

    db.commit()
    db.refresh(spare)
    return spare


# ---------------- UPDATE ----------------
def update_spare_part(db: Session, spare_id: int, data):
    spare = db.query(SparePart).filter(SparePart.id == spare_id).first()
    if not spare:
        raise HTTPException(404, "Spare part not found")

    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == spare.vehicle_number
    ).first()

    old_cost = spare.cost * spare.quantity
    new_cost = data.cost * data.quantity

    spare.part_name = data.part_name
    spare.cost = data.cost
    spare.quantity = data.quantity
    spare.vendor = data.vendor
    spare.replaced_date = data.replaced_date

    if vehicle:
        vehicle.total_maintenance_cost += (new_cost - old_cost)

    db.commit()
    db.refresh(spare)
    return spare


# ---------------- DELETE ----------------
def delete_spare_part(db: Session, spare_id: int):
    spare = db.query(SparePart).filter(SparePart.id == spare_id).first()
    if not spare:
        raise HTTPException(404, "Spare part not found")

    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == spare.vehicle_number
    ).first()

    if vehicle:
        vehicle.total_maintenance_cost -= spare.cost * spare.quantity

    db.delete(spare)
    db.commit()
    return {"message": "Spare part deleted"}


# ---------------- LIST ----------------
def spare_parts_by_vehicle(db: Session, vehicle_number: str):
    return (
        db.query(SparePart)
        .filter(SparePart.vehicle_number == vehicle_number)
        .order_by(SparePart.replaced_date.desc())
        .all()
    )


def get_all_spare_parts(db: Session):
    return db.query(SparePart).order_by(
        SparePart.replaced_date.desc()
    ).all()
