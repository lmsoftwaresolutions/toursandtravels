from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import SessionLocal
from app.models.trip import Trip
from app.models.fuel import Fuel
from app.models.vehicle import Vehicle
from app.models.spare_part import SparePart

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def dashboard_summary(db: Session = Depends(get_db)):
    # -------- TRIPS --------
    total_trips = db.query(func.count(Trip.id)).scalar() or 0

    # -------- INCOME & DUES --------
    income = db.query(func.coalesce(func.sum(Trip.total_charged), 0)).scalar()
    total_due = db.query(func.coalesce(func.sum(Trip.pending_amount), 0)).scalar()

    # -------- EXPENSES --------
    trip_expenses = db.query(func.coalesce(func.sum(Trip.total_cost), 0)).scalar()
    fuel_cost = db.query(func.coalesce(func.sum(Fuel.total_cost), 0)).scalar()
    maintenance_cost = db.query(
        func.coalesce(func.sum(Vehicle.total_maintenance_cost), 0)
    ).scalar()

    expenses = trip_expenses + fuel_cost + maintenance_cost
    profit = income - expenses

    # -------- VEHICLE SUMMARY --------
    vehicles = db.query(Vehicle).all()
    vehicle_summary = [
        {
            "vehicle_number": v.vehicle_number,
            "maintenance_cost": v.total_maintenance_cost
        }
        for v in vehicles
    ]

    return {
        "trips": total_trips,
        "income": income,
        "expenses": expenses,
        "profit": profit,
        "total_due": total_due,
        "vehicles": vehicle_summary
    }
