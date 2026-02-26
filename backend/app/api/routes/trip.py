from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.trip import Trip
from app.schemas.trip import TripCreate, TripResponse, TripUpdate
from app.services.trip_service import (
    create_trip,
    get_trips_by_vehicle,
    get_trips_by_driver,
    update_trip,
    delete_trip
)

router = APIRouter(
    prefix="/trips",
    tags=["Trips"]
)

# ---------------- DB DEPENDENCY ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- CREATE TRIP ----------------
@router.post("", response_model=TripResponse)
def add_trip(trip: TripCreate, db: Session = Depends(get_db)):
    return create_trip(db, trip)

# ---------------- GET ALL TRIPS ----------------
@router.get("", response_model=list[TripResponse])
def get_all_trips(db: Session = Depends(get_db)):
    return db.query(Trip).order_by(Trip.created_at.desc()).all()

# ---------------- GET TRIPS BY VEHICLE ----------------
@router.get("/vehicle/{vehicle_number}", response_model=list[TripResponse])
def trips_by_vehicle(vehicle_number: str, db: Session = Depends(get_db)):
    return get_trips_by_vehicle(db, vehicle_number)

# ---------------- GET TRIPS BY DRIVER ----------------
@router.get("/driver/{driver_id}", response_model=list[TripResponse])
def trips_by_driver(driver_id: int, db: Session = Depends(get_db)):
    return get_trips_by_driver(db, driver_id)

# ---------------- GET SINGLE TRIP ----------------
@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

# ---------------- UPDATE TRIP ----------------
@router.put("/{trip_id}", response_model=TripResponse)
def edit_trip(trip_id: int, trip: TripUpdate, db: Session = Depends(get_db)):
    return update_trip(db, trip_id, trip)

# ---------------- DELETE TRIP ----------------
@router.delete("/{trip_id}")
def remove_trip(trip_id: int, db: Session = Depends(get_db)):
    return delete_trip(db, trip_id)
