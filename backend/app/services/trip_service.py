from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.customer import Customer
from app.schemas.trip import TripCreate, TripUpdate


# =========================
# CREATE TRIP
# =========================
def create_trip(db: Session, trip_data: TripCreate):
    # Validate invoice number
    if not trip_data.invoice_number or trip_data.invoice_number.strip() == "":
        raise HTTPException(400, "Invoice number is required")
    
    # Validate pricing inputs
    if trip_data.pricing_type not in {"per_km", "package"}:
        raise HTTPException(400, "Invalid pricing type")

    if trip_data.pricing_type == "per_km":
        if not trip_data.distance_km or trip_data.distance_km <= 0:
            raise HTTPException(400, "Distance must be greater than zero for per-km pricing")
    else:  # package
        if trip_data.package_amount <= 0:
            raise HTTPException(400, "Package amount must be greater than zero")

    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == trip_data.vehicle_number
    ).first()
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    driver = db.query(Driver).filter(
        Driver.id == trip_data.driver_id
    ).first()
    if not driver:
        raise HTTPException(404, "Driver not found")

    customer = db.query(Customer).filter(
        Customer.id == trip_data.customer_id
    ).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    # 🔢 TOTAL COST (PHASE-2)
    total_cost = (
        trip_data.diesel_used +
        trip_data.petrol_used +
        trip_data.toll_amount +
        trip_data.parking_amount +
        trip_data.other_expenses
    )

    # 💰 CUSTOMER CHARGES (toll/parking paid on spot, not included)
    total_charged = (
        trip_data.package_amount
        if trip_data.pricing_type == "package"
        else (trip_data.distance_km or 0) * trip_data.cost_per_km
    )
    pending_amount = max(total_charged - trip_data.amount_received, 0)

    trip = Trip(
        trip_date=trip_data.trip_date,
        departure_datetime=trip_data.departure_datetime,
        return_datetime=trip_data.return_datetime,
        from_location=trip_data.from_location,
        to_location=trip_data.to_location,
        route_details=trip_data.route_details,
        vehicle_number=trip_data.vehicle_number,
        driver_id=trip_data.driver_id,
        customer_id=trip_data.customer_id,
        distance_km=trip_data.distance_km or 0,
        diesel_used=trip_data.diesel_used,
        petrol_used=trip_data.petrol_used,
        toll_amount=trip_data.toll_amount,
        parking_amount=trip_data.parking_amount,
        other_expenses=trip_data.other_expenses,
        vendor=trip_data.vendor,
        total_cost=total_cost,
        pricing_type=trip_data.pricing_type,
        package_amount=trip_data.package_amount,
        cost_per_km=trip_data.cost_per_km,
        charged_toll_amount=trip_data.charged_toll_amount,
        charged_parking_amount=trip_data.charged_parking_amount,
        amount_received=trip_data.amount_received,
        advance_payment=trip_data.advance_payment,
        total_charged=total_charged,
        pending_amount=pending_amount
    )

    db.add(trip)

    # 🔄 UPDATE STATS
    vehicle.total_trips += 1
    vehicle.total_km += (trip_data.distance_km or 0)
    customer.total_trips += 1
    customer.total_billed += total_charged
    customer.pending_balance += pending_amount

    db.commit()
    db.refresh(trip)
    return trip


# =========================
# GET TRIPS BY VEHICLE
# =========================
def get_trips_by_vehicle(db: Session, vehicle_number: str):
    return (
        db.query(Trip)
        .filter(Trip.vehicle_number == vehicle_number)
        .order_by(Trip.trip_date.desc())
        .all()
    )


# =========================
# GET TRIPS BY DRIVER
# =========================
def get_trips_by_driver(db: Session, driver_id: int):
    return (
        db.query(Trip)
        .filter(Trip.driver_id == driver_id)
        .order_by(Trip.trip_date.desc())
        .all()
    )


# =========================
# UPDATE TRIP
# =========================
def update_trip(db: Session, trip_id: int, data: TripUpdate):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    # 🔁 HANDLE DISTANCE CHANGE
    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == trip.vehicle_number
    ).first()

    distance_diff = (data.distance_km or 0) - (trip.distance_km or 0)
    vehicle.total_km += distance_diff

    # Validate pricing inputs
    if data.pricing_type not in {"per_km", "package"}:
        raise HTTPException(400, "Invalid pricing type")

    if data.pricing_type == "per_km":
        if not data.distance_km or data.distance_km <= 0:
            raise HTTPException(400, "Distance must be greater than zero for per-km pricing")
    else:  # package
        if data.package_amount <= 0:
            raise HTTPException(400, "Package amount must be greater than zero")

    # 🔄 UPDATE FIELDS
    trip.trip_date = data.trip_date
    trip.departure_datetime = data.departure_datetime
    trip.return_datetime = data.return_datetime
    trip.from_location = data.from_location
    trip.to_location = data.to_location
    trip.route_details = data.route_details
    trip.vehicle_number = data.vehicle_number
    trip.driver_id = data.driver_id
    trip.customer_id = data.customer_id
    trip.distance_km = data.distance_km or 0

    trip.diesel_used = data.diesel_used
    trip.petrol_used = data.petrol_used
    trip.toll_amount = data.toll_amount
    trip.parking_amount = data.parking_amount
    trip.other_expenses = data.other_expenses
    trip.vendor = data.vendor

    # 🔢 RECALCULATE COST
    trip.total_cost = (
        data.diesel_used +
        data.petrol_used +
        data.toll_amount +
        data.parking_amount +
        data.other_expenses
    )

    # 💰 RECALCULATE CHARGES
    prior_total_charged = trip.total_charged
    prior_pending = trip.pending_amount

    trip.pricing_type = data.pricing_type
    trip.package_amount = data.package_amount
    trip.cost_per_km = data.cost_per_km
    trip.charged_toll_amount = data.charged_toll_amount
    trip.charged_parking_amount = data.charged_parking_amount
    trip.amount_received = data.amount_received
    trip.advance_payment = data.advance_payment

    trip.total_charged = (
        data.package_amount
        if data.pricing_type == "package"
        else (data.distance_km or 0) * data.cost_per_km
    )
    trip.pending_amount = max(trip.total_charged - data.amount_received, 0)

    # 🔄 UPDATE CUSTOMER BILLING DELTAS
    customer = db.query(Customer).filter(Customer.id == trip.customer_id).first()
    if customer:
        customer.total_billed += trip.total_charged - prior_total_charged
        customer.pending_balance += trip.pending_amount - prior_pending

    db.commit()
    db.refresh(trip)
    return trip


# =========================
# DELETE TRIP
# =========================
def delete_trip(db: Session, trip_id: int):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")

    vehicle = db.query(Vehicle).filter(
        Vehicle.vehicle_number == trip.vehicle_number
    ).first()
    customer = db.query(Customer).filter(
        Customer.id == trip.customer_id
    ).first()

    # 🔄 ROLLBACK STATS
    if vehicle:
        vehicle.total_trips -= 1
        vehicle.total_km -= (trip.distance_km or 0)

    if customer:
        customer.total_trips -= 1
        customer.total_billed -= trip.total_charged
        customer.pending_balance -= trip.pending_amount

    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}
