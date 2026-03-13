from sqlalchemy.orm import Session
from app.models.mechanic import MechanicEntry
from app.schemas.mechanic import MechanicCreate


def add_mechanic_entry(db: Session, data: MechanicCreate):
    entry = MechanicEntry(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_all_mechanic_entries(db: Session):
    return db.query(MechanicEntry).order_by(MechanicEntry.service_date.desc()).all()


def get_mechanic_by_vehicle(db: Session, vehicle_number: str):
    return (
        db.query(MechanicEntry)
        .filter(MechanicEntry.vehicle_number == vehicle_number)
        .order_by(MechanicEntry.service_date.desc())
        .all()
    )


def get_mechanic_by_id(db: Session, entry_id: int):
    return db.query(MechanicEntry).filter(MechanicEntry.id == entry_id).first()


def update_mechanic_entry(db: Session, entry_id: int, data: MechanicCreate):
    entry = get_mechanic_by_id(db, entry_id)
    if not entry:
        return None
    for key, value in data.model_dump().items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_mechanic_entry(db: Session, entry_id: int):
    entry = get_mechanic_by_id(db, entry_id)
    if not entry:
        return None
    db.delete(entry)
    db.commit()
    return entry
