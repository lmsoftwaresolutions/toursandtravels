from sqlalchemy.orm import Session, selectinload
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

    vehicle_trips = (
        db.query(Trip)
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_number.lower())
        .options(selectinload(Trip.vehicles))
        .all()
    )

    vehicle_key = vehicle_number.lower()
    total_km = 0.0
    trip_cost = 0.0
    trip_fuel_cost = 0.0

    for trip in vehicle_trips:
        vehicles = list(trip.vehicles or [])
        if not vehicles:
            continue

        subtotals = []
        for v in vehicles:
            pricing_type = (v.pricing_type or "per_km").lower()
            base = (v.package_amount or 0) if pricing_type == "package" else (v.distance_km or 0) * (v.cost_per_km or 0)
            subtotal = (base or 0) + (v.toll_amount or 0) + (v.parking_amount or 0) + (v.other_expenses or 0)
            subtotals.append((v, subtotal))

        sum_subtotal = sum(value for _, value in subtotals)
        trip_total = trip.total_charged or 0
        vehicle_count = len(subtotals) if subtotals else max(trip.number_of_vehicles or 1, 1)

        for v, subtotal in subtotals:
            if (v.vehicle_number or "").lower() != vehicle_key:
                continue

            total_km += v.distance_km or 0

            vehicle_fuel_cost = v.fuel_cost or 0
            if not vehicle_fuel_cost:
                vehicle_fuel_cost = (v.diesel_used or 0) + (v.petrol_used or 0)
            trip_fuel_cost += vehicle_fuel_cost

            if sum_subtotal > 0:
                trip_cost += subtotal + (trip_total - sum_subtotal) * (subtotal / sum_subtotal)
            else:
                trip_cost += trip_total / vehicle_count

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
    trip_fuel_cost = trip_fuel_cost or 0

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
