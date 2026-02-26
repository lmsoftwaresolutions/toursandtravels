from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
import calendar

from app.database.session import SessionLocal
from app.models.trip import Trip
from app.models.fuel import Fuel
from app.models.vehicle import Vehicle
from app.models.spare_part import SparePart
from app.models.maintenance import Maintenance
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def dashboard_summary(
    db: Session = Depends(get_db),
    month: str | None = Query(
        default=None,
        regex=r"^\d{4}-\d{2}$",
        description="Format: YYYY-MM"
    ),
    _current_user=Depends(get_current_user),
):
    start_date = None
    end_date = None
    if month:
        try:
            year, mon = map(int, month.split("-"))
            last_day = calendar.monthrange(year, mon)[1]
            start_date = date(year, mon, 1)
            end_date = date(year, mon, last_day)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    # -------- TRIPS --------
    trip_query = db.query(Trip)
    if start_date and end_date:
        trip_query = trip_query.filter(Trip.trip_date.between(start_date, end_date))
    total_trips = trip_query.with_entities(func.count(Trip.id)).scalar() or 0

    # -------- INCOME & DUES --------
    income = trip_query.with_entities(func.coalesce(func.sum(Trip.total_charged), 0)).scalar()
    total_due = trip_query.with_entities(func.coalesce(func.sum(Trip.pending_amount), 0)).scalar()

    # -------- EXPENSES --------
    trip_expenses = trip_query.with_entities(func.coalesce(func.sum(Trip.total_cost), 0)).scalar()

    fuel_query = db.query(Fuel)
    if start_date and end_date:
        fuel_query = fuel_query.filter(Fuel.filled_date.between(start_date, end_date))
    fuel_cost = fuel_query.with_entities(func.coalesce(func.sum(Fuel.total_cost), 0)).scalar()

    maintenance_query = db.query(Maintenance)
    if start_date and end_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())
        maintenance_query = maintenance_query.filter(Maintenance.start_date.between(start_dt, end_dt))
    maintenance_cost = maintenance_query.with_entities(func.coalesce(func.sum(Maintenance.amount), 0)).scalar()

    spare_query = db.query(SparePart)
    if start_date and end_date:
        spare_query = spare_query.filter(SparePart.replaced_date.between(start_date, end_date))
    spare_cost = spare_query.with_entities(
        func.coalesce(func.sum(SparePart.cost * SparePart.quantity), 0)
    ).scalar()

    expenses = trip_expenses + fuel_cost + maintenance_cost + spare_cost
    profit = income - expenses

    # -------- VEHICLE SUMMARY --------
    vehicles = db.query(Vehicle).all()
    vehicle_summary = [
        {
            "id": v.id,
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
