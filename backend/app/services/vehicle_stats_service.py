from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.trip import Trip
from app.models.trip_vehicle import TripVehicle
from app.models.vehicle import Vehicle
from app.models.fuel import Fuel
from app.models.spare_part import SparePart
from app.services.maintenance_service import calculate_monthly_maintenance_cost


def vehicle_summary(db: Session, vehicle_number: str):
    # -------- VEHICLE (SOFT DELETE SAFE) --------
    vehicle = (
        db.query(Vehicle)
        .filter(
            func.lower(Vehicle.vehicle_number) == vehicle_number.lower(),
            Vehicle.is_deleted == False
        )
        .first()
    )

    if not vehicle:
        return None  # handled in route with 404

    # -------- TRIP DATA --------
    total_trips = (
        db.query(func.count(func.distinct(Trip.id)))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .scalar()
        or 0
    )

    total_km = (
        db.query(func.coalesce(func.sum(Trip.distance_km), 0))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .scalar()
    )

    trip_cost = (
        db.query(func.coalesce(func.sum(Trip.total_charged), 0))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .scalar()
    )

    customers = (
        db.query(func.count(func.distinct(Trip.customer_id)))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .scalar()
        or 0
    )

    # -------- MAINTENANCE COST (including EMI, Insurance, Tax) --------
    monthly_maintenance_cost = calculate_monthly_maintenance_cost(db, vehicle_number)
    maintenance_cost = vehicle.total_maintenance_cost or 0

    # -------- FUEL COST (BY TYPE) --------
    trip_fuel_cost = (
        db.query(func.coalesce(func.sum(Trip.diesel_used + Trip.petrol_used), 0))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .scalar()
        or 0
    )

    fuel_by_type = (
        db.query(
            Fuel.fuel_type,
            func.coalesce(func.sum(Fuel.total_cost), 0).label("cost")
        )
        .filter(
            func.lower(Fuel.vehicle_number) == vehicle_number.lower()
        )
        .group_by(Fuel.fuel_type)
        .all()
    )

    fuel_costs = {f.fuel_type: f.cost for f in fuel_by_type}
    direct_fuel_cost = sum(fuel_costs.values())
    total_fuel_cost = direct_fuel_cost + trip_fuel_cost

    # -------- SPARE PARTS --------
    spare_parts = (
        db.query(SparePart)
        .filter(
            func.lower(SparePart.vehicle_number) == vehicle_number.lower()
        )
        .order_by(SparePart.replaced_date.desc())
        .all()
    )

    # -------- FINAL SUMMARY --------
    return {
        "vehicle_number": vehicle_number,

        # core stats
        "total_trips": total_trips,
        "total_km": total_km,
        "trip_cost": trip_cost,
        "maintenance_cost": maintenance_cost,
        "monthly_maintenance_cost": monthly_maintenance_cost,
        "fuel_costs": fuel_costs,
        "direct_fuel_cost": direct_fuel_cost,
        "trip_fuel_cost": trip_fuel_cost,
        "total_fuel_cost": total_fuel_cost,
        "total_vehicle_cost": trip_cost + maintenance_cost + total_fuel_cost + monthly_maintenance_cost,
        "customers_served": customers,

        # spare parts table
        "spare_parts": [
            {
                "id": sp.id,
                "part_name": sp.part_name,
                "cost": sp.cost,
                "quantity": sp.quantity,
                "vendor": sp.vendor,
                "replaced_date": sp.replaced_date
            }
            for sp in spare_parts
        ]
    }
