from sqlalchemy import or_
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.customer import Customer
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.trip_driver_change import TripDriverChange
from app.models.trip_pricing_item import TripPricingItem
from app.models.trip_vehicle import TripVehicle
from app.models.vehicle import Vehicle
from app.schemas.trip import TripCreate, TripUpdate


def _calculate_trip_days(departure_datetime, return_datetime):
    if not departure_datetime or not return_datetime:
        return 1
    if return_datetime < departure_datetime:
        raise HTTPException(400, "Return date/time cannot be before departure date/time")
    return (return_datetime.date() - departure_datetime.date()).days + 1


def _calculate_base_pricing(pricing_type, package_amount, trip_days, distance_km, cost_per_km, number_of_vehicles):
    base_amount = (
        package_amount
        if pricing_type == "package"
        else (distance_km or 0) * cost_per_km
    )
    return base_amount * number_of_vehicles


def _calculate_vehicle_base_pricing(trip_vehicles, default_pricing_type, default_package_amount, default_cost_per_km):
    total = 0
    for entry in trip_vehicles or []:
        pricing_type = entry.get("pricing_type") or default_pricing_type
        package_amount = entry.get("package_amount")
        cost_per_km = entry.get("cost_per_km")
        distance_km = entry.get("distance_km") or 0

        package_value = default_package_amount if package_amount is None else package_amount
        rate_value = default_cost_per_km if cost_per_km is None else cost_per_km

        if pricing_type == "package":
            total += package_value or 0
        else:
            total += (distance_km or 0) * (rate_value or 0)
    return total


def _calculate_pricing_items_total(pricing_items, number_of_vehicles):
    return sum(
        (i.amount if i.amount else (i.quantity or 1) * (i.rate or 0))
        for i in pricing_items
    ) * number_of_vehicles


def _normalize_trip_vehicles(trip_data):
    if trip_data.vehicles:
        return trip_data.vehicles
    if trip_data.vehicle_number or trip_data.driver_id:
        if not trip_data.vehicle_number or not trip_data.driver_id:
            raise HTTPException(400, "Vehicle and driver are required when assigning a vehicle")
        return [
            {
                "vehicle_number": trip_data.vehicle_number,
                "driver_id": trip_data.driver_id,
                "start_km": trip_data.start_km,
                "end_km": trip_data.end_km,
                "distance_km": trip_data.distance_km,
                "driver_bhatta": trip_data.driver_bhatta,
                "vehicle_type": trip_data.bus_type,
                "seat_count": None,
                "pricing_type": trip_data.pricing_type,
                "package_amount": trip_data.package_amount,
                "cost_per_km": trip_data.cost_per_km,
            }
        ]
    return []


def _get_entry_value(item, key, default=None):
    if hasattr(item, key):
        value = getattr(item, key)
        return default if value is None else value
    value = item.get(key, default)
    return default if value is None else value


def _validate_trip_vehicles(db: Session, trip_vehicles):
    if not trip_vehicles:
        return []
    validated = []
    seen_vehicle_numbers = set()

    for item in trip_vehicles:
        vehicle_number = _get_entry_value(item, "vehicle_number")
        driver_id = _get_entry_value(item, "driver_id")
        start_km = _get_entry_value(item, "start_km", None)
        end_km = _get_entry_value(item, "end_km", None)
        distance_km = _get_entry_value(item, "distance_km", None)
        driver_bhatta = _get_entry_value(item, "driver_bhatta", 0)
        vehicle_type = _get_entry_value(item, "vehicle_type", None)
        seat_count = _get_entry_value(item, "seat_count", None)
        pricing_type = _get_entry_value(item, "pricing_type", "per_km")
        package_amount = _get_entry_value(item, "package_amount", 0)
        cost_per_km = _get_entry_value(item, "cost_per_km", 0)

        if not vehicle_number:
            raise HTTPException(400, "Vehicle is required for every vehicle entry")
        if not driver_id:
            raise HTTPException(400, f"Driver is required for vehicle {vehicle_number}")
        if start_km is not None and end_km is not None and end_km < start_km:
            raise HTTPException(400, f"End KM cannot be less than Start KM for vehicle {vehicle_number}")
        if vehicle_number in seen_vehicle_numbers:
            raise HTTPException(400, f"Duplicate vehicle selected: {vehicle_number}")
        seen_vehicle_numbers.add(vehicle_number)

        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == vehicle_number).first()
        if not vehicle:
            raise HTTPException(404, f"Vehicle not found: {vehicle_number}")

        driver = db.query(Driver).filter(Driver.id == driver_id).first()
        if not driver:
            raise HTTPException(404, f"Driver not found: {driver_id}")

        # Backfill from master vehicle if missing or blank in the request
        if not vehicle_type:
            vehicle_type = vehicle.vehicle_type
        if seat_count in (None, "", 0):
            seat_count = vehicle.seat_count

        derived_distance = None
        if start_km is not None and end_km is not None:
            derived_distance = max(int(end_km - start_km), 0)

        validated.append({
            "vehicle": vehicle,
            "driver": driver,
            "vehicle_number": vehicle_number,
            "driver_id": driver_id,
            "start_km": start_km,
            "end_km": end_km,
            "distance_km": distance_km if distance_km is not None else derived_distance,
            "driver_bhatta": driver_bhatta or 0,
            "vehicle_type": vehicle_type,
            "seat_count": seat_count,
            "pricing_type": pricing_type or "per_km",
            "package_amount": package_amount or 0,
            "cost_per_km": cost_per_km or 0,
            "fuel_cost": _get_entry_value(item, "fuel_cost", 0),
            "fuel_litres": _get_entry_value(item, "fuel_litres", 0),
            "diesel_used": _get_entry_value(item, "diesel_used", 0),
            "petrol_used": _get_entry_value(item, "petrol_used", 0),
            "fuel_price": _get_entry_value(item, "fuel_price", 0),
            "fuel_vendor": _get_entry_value(item, "fuel_vendor", None),
            "toll_amount": _get_entry_value(item, "toll_amount", 0),
            "parking_amount": _get_entry_value(item, "parking_amount", 0),
            "other_expenses": _get_entry_value(item, "other_expenses", 0),
            "expenses": _get_entry_value(item, "expenses", []),
            "driver_changes": _get_entry_value(item, "driver_changes", []),
        })

    return validated


def _assign_trip_primary_fields(trip: Trip, trip_vehicles, number_of_vehicles=None):
    if not trip_vehicles:
        trip.vehicle_number = None
        trip.driver_id = None
        trip.start_km = 0
        trip.end_km = 0
        trip.distance_km = None
        trip.number_of_vehicles = number_of_vehicles or 1
        trip.driver_bhatta = 0
        return
    primary = trip_vehicles[0]
    total_distance = sum(entry["distance_km"] or 0 for entry in trip_vehicles)
    total_driver_bhatta = sum(entry["driver_bhatta"] or 0 for entry in trip_vehicles)

    trip.vehicle_number = primary["vehicle_number"]
    trip.driver_id = primary["driver_id"]
    trip.start_km = primary["start_km"] or 0
    trip.end_km = primary["end_km"] or 0
    trip.distance_km = total_distance or None
    trip.number_of_vehicles = number_of_vehicles or len(trip_vehicles)
    trip.driver_bhatta = total_driver_bhatta


def _replace_trip_vehicles(db: Session, trip: Trip, trip_vehicles):
    existing_entries = list(trip.vehicles or [])
    for entry in existing_entries:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == entry.vehicle_number).first()
        if vehicle:
            vehicle.total_trips = max((vehicle.total_trips or 0) - 1, 0)
            vehicle.total_km = max((vehicle.total_km or 0) - (entry.distance_km or 0), 0)
        db.delete(entry)
    db.flush()

    from app.models.trip_vehicle_expense import TripVehicleExpense

    for entry in trip_vehicles:
        tv = TripVehicle(
            trip_id=trip.id,
            vehicle_number=entry["vehicle_number"],
            driver_id=entry["driver_id"],
            start_km=entry["start_km"] or 0,
            end_km=entry["end_km"] or 0,
            distance_km=entry["distance_km"],
            driver_bhatta=entry["driver_bhatta"] or 0,
            vehicle_type=entry.get("vehicle_type"),
            seat_count=entry.get("seat_count"),
            pricing_type=entry.get("pricing_type", "per_km"),
            package_amount=entry.get("package_amount", 0),
            cost_per_km=entry.get("cost_per_km", 0),
            fuel_cost=entry["fuel_cost"],
            fuel_litres=entry["fuel_litres"],
            diesel_used=entry.get("diesel_used", 0) if isinstance(entry, dict) else (entry.diesel_used or 0),
            petrol_used=entry.get("petrol_used", 0) if isinstance(entry, dict) else (entry.petrol_used or 0),
            fuel_price=entry.get("fuel_price", 0) if isinstance(entry, dict) else (entry.fuel_price or 0),
            fuel_vendor=entry.get("fuel_vendor") if isinstance(entry, dict) else entry.fuel_vendor,
            toll_amount=entry["toll_amount"],
            parking_amount=entry["parking_amount"],
            other_expenses=entry["other_expenses"],
            bus_type=entry.get("bus_type") if isinstance(entry, dict) else entry.bus_type,
        )
        db.add(tv)
        db.flush() # Get tv.id for nested expenses

        # Save per-vehicle expenses
        for exp in entry["expenses"]:
            db.add(TripVehicleExpense(
                trip_vehicle_id=tv.id,
                expense_type=exp.expense_type if hasattr(exp, "expense_type") else exp.get("expense_type"),
                amount=exp.amount if hasattr(exp, "amount") else exp.get("amount", 0),
                notes=exp.notes if hasattr(exp, "notes") else exp.get("notes"),
            ))
        
        # Save per-vehicle driver changes
        for dc in entry["driver_changes"]:
            db.add(TripDriverChange(
                trip_id=trip.id,
                driver_id=dc.driver_id if hasattr(dc, "driver_id") else dc.get("driver_id"),
                start_time=dc.start_time if hasattr(dc, "start_time") else dc.get("start_time"),
                end_time=dc.end_time if hasattr(dc, "end_time") else dc.get("end_time"),
                vehicle_number=entry["vehicle_number"], # Linked by number
                notes=dc.notes if hasattr(dc, "notes") else dc.get("notes"),
            ))

        entry["vehicle"].total_trips += 1
        entry["vehicle"].total_km += (entry["distance_km"] or 0)


def _save_pricing_items(db: Session, trip_id: int, pricing_items, charge_items):
    db.query(TripPricingItem).filter(TripPricingItem.trip_id == trip_id).delete()

    for item in pricing_items:
        amount = item.amount if item.amount else (item.quantity or 1) * (item.rate or 0)
        db.add(TripPricingItem(
            trip_id=trip_id,
            description=item.description,
            quantity=item.quantity or 1,
            rate=item.rate or 0,
            amount=amount,
            item_type="pricing"
        ))

    for item in charge_items:
        amount = item.amount if item.amount else (item.quantity or 1) * (item.rate or 0)
        db.add(TripPricingItem(
            trip_id=trip_id,
            description=item.description,
            quantity=item.quantity or 1,
            rate=item.rate or 0,
            amount=amount,
            item_type="charge"
        ))


def _save_driver_changes(db: Session, trip_id: int, driver_changes):
    db.query(TripDriverChange).filter(TripDriverChange.trip_id == trip_id).delete()
    for dc in (driver_changes or []):
        db.add(TripDriverChange(
            trip_id=trip_id,
            driver_id=dc.driver_id if hasattr(dc, "driver_id") else dc.get("driver_id"),
            start_time=dc.start_time if hasattr(dc, "start_time") else dc.get("start_time"),
            end_time=dc.end_time if hasattr(dc, "end_time") else dc.get("end_time"),
            vehicle_number=dc.vehicle_number if hasattr(dc, "vehicle_number") else dc.get("vehicle_number"),
            notes=dc.notes if hasattr(dc, "notes") else dc.get("notes")
        ))


def create_trip(db: Session, trip_data: TripCreate):
    if trip_data.discount_amount and not (500 <= trip_data.discount_amount <= 1000):
        raise HTTPException(400, "Discount must be between ₹500 and ₹1000")
    if not trip_data.invoice_number or trip_data.invoice_number.strip() == "":
        raise HTTPException(400, "Invoice number is required")
    existing_invoice = (
        db.query(Trip)
        .filter(Trip.invoice_number == trip_data.invoice_number.strip())
        .first()
    )
    if existing_invoice:
        raise HTTPException(400, "Invoice number already exists")
    if trip_data.pricing_type not in {"per_km", "package"}:
        raise HTTPException(400, "Invalid pricing type")

    uses_explicit_vehicle_entries = bool(trip_data.vehicles)
    validated_trip_vehicles = _validate_trip_vehicles(db, _normalize_trip_vehicles(trip_data))
    has_vehicle_entries = len(validated_trip_vehicles) > 0
    total_distance_km = (
        sum(entry["distance_km"] or 0 for entry in validated_trip_vehicles)
        if has_vehicle_entries
        else (trip_data.distance_km or 0)
    )
    total_driver_bhatta = sum(entry["driver_bhatta"] or 0 for entry in validated_trip_vehicles)
    number_of_vehicles = (
        len(validated_trip_vehicles)
        if uses_explicit_vehicle_entries and has_vehicle_entries
        else max(int(trip_data.number_of_vehicles or 1), 1)
    )

    if trip_data.pricing_type == "per_km" and has_vehicle_entries:
        if total_distance_km <= 0:
            raise HTTPException(400, "Distance must be greater than zero for per-km pricing")
    elif trip_data.package_amount <= 0 and has_vehicle_entries:
        raise HTTPException(400, "Package amount must be greater than zero")

    customer = db.query(Customer).filter(Customer.id == trip_data.customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")

    total_vehicle_expenses = sum(
        entry["fuel_cost"] + entry["toll_amount"] + entry["parking_amount"] + entry["other_expenses"] + entry["driver_bhatta"] +
        sum(exp.get("amount", 0) if isinstance(exp, dict) else (exp.amount or 0) for exp in entry["expenses"])
        for entry in validated_trip_vehicles
    )

    total_cost = total_vehicle_expenses

    pricing_items = trip_data.pricing_items or []
    charge_items = trip_data.charge_items or []
    trip_days = _calculate_trip_days(trip_data.departure_datetime, trip_data.return_datetime)
    base_pricing_vehicle_count = 1 if uses_explicit_vehicle_entries and trip_data.pricing_type == "per_km" else number_of_vehicles

    base_pricing_total = (
        _calculate_vehicle_base_pricing(
            validated_trip_vehicles,
            trip_data.pricing_type,
            trip_data.package_amount,
            trip_data.cost_per_km,
        )
        if has_vehicle_entries
        else _calculate_base_pricing(
            trip_data.pricing_type,
            trip_data.package_amount,
            trip_days,
            total_distance_km,
            trip_data.cost_per_km,
            base_pricing_vehicle_count,
        )
    )
    pricing_items_total = _calculate_pricing_items_total(
        pricing_items,
        number_of_vehicles,
    )
    charges_total = sum(
        (i.amount if i.amount else (i.quantity or 1) * (i.rate or 0))
        for i in charge_items
    )

    total_charged = (
        base_pricing_total +
        pricing_items_total +
        trip_data.charged_toll_amount +
        trip_data.charged_parking_amount +
        charges_total +
        trip_data.other_expenses -
        (trip_data.discount_amount or 0)
    )
    pending_amount = max(total_charged - trip_data.amount_received, 0)

    trip = Trip(
        invoice_number=trip_data.invoice_number,
        trip_date=trip_data.trip_date,
        booking_id=trip_data.booking_id,
        departure_datetime=trip_data.departure_datetime,
        return_datetime=trip_data.return_datetime,
        from_location=trip_data.from_location,
        to_location=trip_data.to_location,
        route_details=trip_data.route_details,
        customer_id=trip_data.customer_id,
        customer_phone=trip_data.customer_phone,
        customer_address=trip_data.customer_address,
        bus_type=trip_data.bus_type,
        bus_detail=trip_data.bus_detail,
        diesel_used=trip_data.diesel_used,
        petrol_used=trip_data.petrol_used,
        fuel_litres=trip_data.fuel_litres,
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
        discount_amount=trip_data.discount_amount,
        amount_received=trip_data.amount_received,
        advance_payment=trip_data.advance_payment,
        total_charged=total_charged,
        pending_amount=pending_amount,
    )

    db.add(trip)
    db.flush()

    _assign_trip_primary_fields(trip, validated_trip_vehicles, number_of_vehicles)
    _replace_trip_vehicles(db, trip, validated_trip_vehicles)
    _save_pricing_items(db, trip.id, pricing_items, charge_items)
    _save_driver_changes(db, trip.id, trip_data.driver_changes or [])

    customer.total_trips += 1
    customer.total_billed += total_charged
    customer.pending_balance += pending_amount

    db.commit()
    db.refresh(trip)
    return trip


def get_trips_by_vehicle(db: Session, vehicle_number: str):
    return (
        db.query(Trip)
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(TripVehicle.vehicle_number == vehicle_number)
        .order_by(Trip.trip_date.desc())
        .distinct()
        .all()
    )


def get_trips_by_driver(db: Session, driver_id: int):
    return (
        db.query(Trip)
        .outerjoin(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(
            or_(
                TripVehicle.driver_id == driver_id,
                Trip.driver_id == driver_id,
            )
        )
        .order_by(Trip.trip_date.desc())
        .distinct()
        .all()
    )


def update_trip(db: Session, trip_id: int, data: TripUpdate, current_user=None):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(404, "Trip not found")
    is_admin = (getattr(current_user, "role", "") or "").lower() == "admin"
    if data.discount_amount and not (500 <= data.discount_amount <= 1000):
        raise HTTPException(400, "Discount must be between ₹500 and ₹1000")
    if data.pricing_type not in {"per_km", "package"}:
        raise HTTPException(400, "Invalid pricing type")
    if not data.invoice_number or data.invoice_number.strip() == "":
        raise HTTPException(400, "Invoice number is required")
    if data.invoice_number.strip() != (trip.invoice_number or ""):
        existing_invoice = (
            db.query(Trip)
            .filter(Trip.invoice_number == data.invoice_number.strip(), Trip.id != trip.id)
            .first()
        )
        if existing_invoice:
            raise HTTPException(400, "Invoice number already exists")

    uses_explicit_vehicle_entries = bool(data.vehicles)
    validated_trip_vehicles = _validate_trip_vehicles(db, _normalize_trip_vehicles(data))
    has_vehicle_entries = len(validated_trip_vehicles) > 0
    total_distance_km = (
        sum(entry["distance_km"] or 0 for entry in validated_trip_vehicles)
        if has_vehicle_entries
        else (data.distance_km or 0)
    )
    total_driver_bhatta = sum(entry["driver_bhatta"] or 0 for entry in validated_trip_vehicles)
    number_of_vehicles = (
        len(validated_trip_vehicles)
        if uses_explicit_vehicle_entries and has_vehicle_entries
        else max(int(data.number_of_vehicles or 1), 1)
    )

    if data.pricing_type == "per_km" and has_vehicle_entries:
        if total_distance_km <= 0:
            raise HTTPException(400, "Distance must be greater than zero for per-km pricing")
    elif data.package_amount <= 0 and has_vehicle_entries:
        raise HTTPException(400, "Package amount must be greater than zero")

    prior_total_charged = trip.total_charged
    prior_pending = trip.pending_amount

    trip.invoice_number = data.invoice_number.strip()
    trip.trip_date = data.trip_date
    trip.booking_id = data.booking_id
    trip.departure_datetime = data.departure_datetime
    trip.return_datetime = data.return_datetime
    trip.from_location = data.from_location
    trip.to_location = data.to_location
    trip.route_details = data.route_details
    trip.customer_id = data.customer_id
    trip.customer_phone = data.customer_phone
    trip.customer_address = data.customer_address
    trip.bus_type = data.bus_type
    trip.bus_detail = data.bus_detail
    trip.diesel_used = data.diesel_used
    trip.petrol_used = data.petrol_used
    trip.fuel_litres = data.fuel_litres
    trip.toll_amount = data.toll_amount
    trip.parking_amount = data.parking_amount
    trip.other_expenses = data.other_expenses
    trip.vendor = data.vendor
    trip.pricing_type = data.pricing_type
    trip.package_amount = data.package_amount
    trip.cost_per_km = data.cost_per_km
    trip.charged_toll_amount = data.charged_toll_amount
    trip.charged_parking_amount = data.charged_parking_amount
    trip.discount_amount = data.discount_amount
    trip.amount_received = data.amount_received
    trip.advance_payment = data.advance_payment
    trip.total_cost = (
        data.diesel_used +
        data.petrol_used +
        data.toll_amount +
        data.parking_amount +
        data.other_expenses +
        total_driver_bhatta
    )
    _assign_trip_primary_fields(trip, validated_trip_vehicles, number_of_vehicles)

    pricing_items = data.pricing_items or []
    charge_items = data.charge_items or []
    trip_days = _calculate_trip_days(data.departure_datetime, data.return_datetime)
    base_pricing_vehicle_count = 1 if uses_explicit_vehicle_entries and data.pricing_type == "per_km" else number_of_vehicles
    base_pricing_total = (
        _calculate_vehicle_base_pricing(
            validated_trip_vehicles,
            data.pricing_type,
            data.package_amount,
            data.cost_per_km,
        )
        if has_vehicle_entries
        else _calculate_base_pricing(
            data.pricing_type,
            data.package_amount,
            trip_days,
            total_distance_km,
            data.cost_per_km,
            base_pricing_vehicle_count,
        )
    )
    pricing_items_total = _calculate_pricing_items_total(pricing_items, number_of_vehicles)
    charges_total = sum(
        (i.amount if i.amount else (i.quantity or 1) * (i.rate or 0))
        for i in charge_items
    )

    trip.total_charged = (
        base_pricing_total +
        pricing_items_total +
        data.charged_toll_amount +
        data.charged_parking_amount +
        charges_total +
        data.other_expenses -
        (data.discount_amount or 0)
    )
    trip.pending_amount = max(trip.total_charged - data.amount_received, 0)

    _replace_trip_vehicles(db, trip, validated_trip_vehicles)
    if is_admin:
        _save_pricing_items(db, trip.id, pricing_items, charge_items)
    _save_driver_changes(db, trip.id, data.driver_changes or [])

    customer = db.query(Customer).filter(Customer.id == trip.customer_id).first()
    if customer and is_admin:
        customer.total_billed += trip.total_charged - prior_total_charged
        customer.pending_balance += trip.pending_amount - prior_pending
    if not is_admin:
        trip.total_charged = prior_total_charged
        trip.pending_amount = prior_pending

    db.commit()
    db.refresh(trip)
    return trip


def delete_trip(db: Session, trip_id: int):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        return {"message": "Trip already deleted"}

    customer = db.query(Customer).filter(Customer.id == trip.customer_id).first()

    for entry in (trip.vehicles or []):
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == entry.vehicle_number).first()
        if vehicle:
            vehicle.total_trips = max((vehicle.total_trips or 0) - 1, 0)
            vehicle.total_km = max((vehicle.total_km or 0) - (entry.distance_km or 0), 0)

    if customer:
        customer.total_trips = max((customer.total_trips or 0) - 1, 0)
        customer.total_billed -= trip.total_charged
        customer.pending_balance -= trip.pending_amount

    db.delete(trip)
    db.commit()
    return {"message": "Trip deleted successfully"}
    return {"message": "Trip deleted successfully"}
