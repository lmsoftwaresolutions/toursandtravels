from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.spare_part import SparePart
from app.models.vehicle import Vehicle
from app.models.maintenance import Maintenance, MaintenanceType
from datetime import datetime, timedelta


def add_spare_part(db: Session, data):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == data.vehicle_number
    ).first()

    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    spare = SparePart(**data.dict())
    db.add(spare)

    # 🔥 CONNECT TO VEHICLE SUMMARY
    vehicle.total_maintenance_cost += data.cost * data.quantity

    db.commit()
    db.refresh(spare)
    return spare


def spare_parts_by_vehicle(db: Session, vehicle_number: str):
    return (
        db.query(SparePart)
        .filter(SparePart.vehicle_number == vehicle_number)
        .order_by(SparePart.replaced_date.desc())
        .all()
    )


def add_maintenance(db: Session, data):
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == data.vehicle_number
    ).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    maintenance = Maintenance(**data.dict())
    db.add(maintenance)
    db.commit()
    db.refresh(maintenance)
    return maintenance


def get_maintenance_by_vehicle(db: Session, vehicle_number: str, maintenance_type: MaintenanceType = None):
    query = db.query(Maintenance).filter(
        Maintenance.vehicle_number == vehicle_number
    )
    
    if maintenance_type:
        query = query.filter(Maintenance.maintenance_type == maintenance_type)
    
    return query.order_by(Maintenance.start_date.desc()).all()


def get_maintenance_by_id(db: Session, maintenance_id: int):
    return db.query(Maintenance).filter(Maintenance.id == maintenance_id).first()


def update_maintenance(db: Session, maintenance_id: int, data):
    maintenance = get_maintenance_by_id(db, maintenance_id)
    
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    for field, value in data.dict(exclude_unset=True).items():
        setattr(maintenance, field, value)
    
    db.commit()
    db.refresh(maintenance)
    return maintenance


def delete_maintenance(db: Session, maintenance_id: int):
    maintenance = get_maintenance_by_id(db, maintenance_id)
    
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    
    db.delete(maintenance)
    db.commit()
    return {"message": "Maintenance record deleted"}


def calculate_monthly_maintenance_cost(db: Session, vehicle_number: str, year: int = None, month: int = None):
    """
    Calculate monthly maintenance cost for a vehicle
    EMI: per month
    Insurance: annual (divided into 12 months)
    Tax: for 3 months (divided into 3 months)
    """
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month
    
    current_date = datetime(year, month, 1)
    
    maintenances = get_maintenance_by_vehicle(db, vehicle_number)
    
    total_cost = 0.0
    
    for maintenance in maintenances:
        if maintenance.start_date > current_date:
            continue
        
        if maintenance.maintenance_type == MaintenanceType.EMI:
            # EMI: per month
            total_cost += maintenance.amount
        
        elif maintenance.maintenance_type == MaintenanceType.INSURANCE:
            # Insurance: annual, divided into 12 months
            total_cost += maintenance.amount / 12
        
        elif maintenance.maintenance_type == MaintenanceType.TAX:
            # Tax: for 3 months, so divide into 3 months
            # Check if current month is within the 3-month period
            start = maintenance.start_date
            end = start + timedelta(days=90)  # approximately 3 months
            if start.date() <= current_date.date() <= end.date():
                total_cost += maintenance.amount / 3
    
    return total_cost