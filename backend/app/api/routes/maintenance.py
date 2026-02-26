from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceUpdate,
    MaintenanceType
)
from app.services.maintenance_service import (
    add_maintenance,
    get_all_maintenance,
    get_maintenance_by_vehicle,
    get_maintenance_by_id,
    update_maintenance,
    delete_maintenance,
    calculate_monthly_maintenance_cost
)

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- CREATE MAINTENANCE ----------------
@router.post("", response_model=MaintenanceResponse)
def create_maintenance(data: MaintenanceCreate, db: Session = Depends(get_db)):
    return add_maintenance(db, data)


@router.get("", response_model=list[MaintenanceResponse])
def list_maintenance(
    maintenance_type: MaintenanceType = Query(None),
    db: Session = Depends(get_db)
):
    return get_all_maintenance(db, maintenance_type)


# ---------------- GET MAINTENANCE BY VEHICLE ----------------
@router.get("/vehicle/{vehicle_number}", response_model=list[MaintenanceResponse])
def maintenance_history(
    vehicle_number: str,
    maintenance_type: MaintenanceType = Query(None),
    db: Session = Depends(get_db)
):
    return get_maintenance_by_vehicle(db, vehicle_number, maintenance_type)


# ---------------- GET MAINTENANCE BY ID ----------------
@router.get("/{maintenance_id}", response_model=MaintenanceResponse)
def get_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    maintenance = get_maintenance_by_id(db, maintenance_id)
    if not maintenance:
        return {"error": "Maintenance record not found"}
    return maintenance


# ---------------- UPDATE MAINTENANCE ----------------
@router.put("/{maintenance_id}", response_model=MaintenanceResponse)
def update_maintenance_record(
    maintenance_id: int,
    data: MaintenanceUpdate,
    db: Session = Depends(get_db)
):
    return update_maintenance(db, maintenance_id, data)


# ---------------- DELETE MAINTENANCE ----------------
@router.delete("/{maintenance_id}")
def delete_maintenance_record(maintenance_id: int, db: Session = Depends(get_db)):
    return delete_maintenance(db, maintenance_id)


# ---------------- MONTHLY COST ----------------
@router.get("/monthly-cost/{vehicle_number}")
def get_monthly_cost(
    vehicle_number: str,
    year: int = Query(None),
    month: int = Query(None),
    db: Session = Depends(get_db)
):
    cost = calculate_monthly_maintenance_cost(db, vehicle_number, year, month)
    return {
        "vehicle_number": vehicle_number,
        "monthly_maintenance_cost": cost
    }
