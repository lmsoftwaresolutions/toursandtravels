from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.driver import Driver
from app.models.driver_salary import DriverSalary
from app.models.fuel import Fuel
from app.models.mechanic import MechanicEntry
from app.models.spare_part import SparePart
from app.models.trip import Trip
from app.models.trip_vehicle import TripVehicle
from app.models.vehicle import Vehicle
from app.services.maintenance_service import calculate_monthly_maintenance_cost
from app.services.vehicle_finance_service import get_vehicle_finance_summary


def _round_2(value: float) -> float:
    return round(float(value or 0), 2)


def _month_key(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        value = value.date()
    return value.strftime("%Y-%m")


def _last_six_months(today: date) -> list[str]:
    keys: list[str] = []
    y, m = today.year, today.month
    for offset in range(5, -1, -1):
        year = y
        month = m - offset
        while month <= 0:
            month += 12
            year -= 1
        keys.append(f"{year:04d}-{month:02d}")
    return keys


def vehicle_summary(db: Session, vehicle_number: str):
    today = date.today()

    vehicle = (
        db.query(Vehicle)
        .filter(func.lower(Vehicle.vehicle_number) == vehicle_number.lower(), Vehicle.is_deleted == False)
        .first()
    )
    if not vehicle:
        return None

    vehicle_key = vehicle_number.lower()

    vehicle_trips = (
        db.query(Trip)
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_key)
        .options(selectinload(Trip.vehicles))
        .all()
    )
    total_trips = len({trip.id for trip in vehicle_trips})

    total_km = 0.0
    trip_cost = 0.0
    trip_fuel_cost = 0.0
    route_counter: Counter[str] = Counter()
    driver_counter: Counter[int] = Counter()
    driver_revenue: defaultdict[int, float] = defaultdict(float)
    monthly_income: defaultdict[str, float] = defaultdict(float)

    completed_trips = 0
    upcoming_trips = 0
    cancelled_trips = 0

    highest_trip = None
    lowest_trip = None

    for trip in vehicle_trips:
        effective_date = (trip.departure_datetime.date() if trip.departure_datetime else trip.trip_date) or today
        if effective_date > today:
            upcoming_trips += 1
        elif (trip.total_charged or 0) <= 0:
            cancelled_trips += 1
        else:
            completed_trips += 1

        route = f"{trip.from_location or '-'} -> {trip.to_location or '-'}"
        route_counter[route] += 1

        trip_total = float(trip.total_charged or 0)
        month = _month_key(effective_date)
        if month:
            monthly_income[month] += trip_total

        if highest_trip is None or trip_total > highest_trip["revenue"]:
            highest_trip = {
                "trip_id": trip.id,
                "invoice_number": trip.invoice_number,
                "route": route,
                "revenue": _round_2(trip_total),
            }
        if lowest_trip is None or trip_total < lowest_trip["revenue"]:
            lowest_trip = {
                "trip_id": trip.id,
                "invoice_number": trip.invoice_number,
                "route": route,
                "revenue": _round_2(trip_total),
            }

        vehicles = list(trip.vehicles or [])
        if not vehicles:
            continue

        subtotals = []
        for tv in vehicles:
            pricing_type = (tv.pricing_type or "per_km").lower()
            base = (tv.package_amount or 0) if pricing_type == "package" else (tv.distance_km or 0) * (tv.cost_per_km or 0)
            subtotal = float((base or 0) + (tv.toll_amount or 0) + (tv.parking_amount or 0) + (tv.other_expenses or 0))
            subtotals.append((tv, subtotal))

        subtotal_sum = sum(value for _, value in subtotals)
        vehicle_count = len(subtotals) if subtotals else max(trip.number_of_vehicles or 1, 1)

        for tv, subtotal in subtotals:
            if (tv.vehicle_number or "").lower() != vehicle_key:
                continue

            total_km += float(tv.distance_km or 0)
            fuel_cost = float(tv.fuel_cost or 0)
            if not fuel_cost:
                fuel_cost = float(tv.diesel_used or 0) + float(tv.petrol_used or 0)
            trip_fuel_cost += fuel_cost

            allocated_revenue = 0.0
            if subtotal_sum > 0:
                allocated_revenue = subtotal + (trip_total - subtotal_sum) * (subtotal / subtotal_sum)
            else:
                allocated_revenue = trip_total / vehicle_count
            trip_cost += allocated_revenue

            if tv.driver_id:
                driver_counter[tv.driver_id] += 1
                driver_revenue[tv.driver_id] += allocated_revenue

    customers = (
        db.query(func.count(func.distinct(Trip.customer_id)))
        .join(TripVehicle, TripVehicle.trip_id == Trip.id)
        .filter(func.lower(TripVehicle.vehicle_number) == vehicle_key)
        .scalar()
        or 0
    )

    monthly_maintenance_cost = calculate_monthly_maintenance_cost(db, vehicle_number)
    maintenance_cost = float(vehicle.total_maintenance_cost or 0)

    fuel_rows = (
        db.query(Fuel)
        .filter(func.lower(Fuel.vehicle_number) == vehicle_key)
        .order_by(Fuel.filled_date.desc())
        .all()
    )
    fuel_costs: dict[str, float] = defaultdict(float)
    direct_fuel_cost = 0.0
    direct_fuel_litres = 0.0
    monthly_fuel_cost: defaultdict[str, float] = defaultdict(float)
    monthly_fuel_litres: defaultdict[str, float] = defaultdict(float)
    for row in fuel_rows:
        fuel_costs[row.fuel_type] += float(row.total_cost or 0)
        direct_fuel_cost += float(row.total_cost or 0)
        direct_fuel_litres += float(row.quantity or 0)
        month = _month_key(row.filled_date)
        if month:
            monthly_fuel_cost[month] += float(row.total_cost or 0)
            monthly_fuel_litres[month] += float(row.quantity or 0)

    fuel_costs = {key: _round_2(value) for key, value in fuel_costs.items()}
    total_fuel_cost = _round_2(direct_fuel_cost + trip_fuel_cost)

    spare_parts = (
        db.query(SparePart)
        .filter(func.lower(SparePart.vehicle_number) == vehicle_key)
        .order_by(SparePart.replaced_date.desc())
        .all()
    )
    spare_parts_replaced = len(spare_parts)

    mechanic_entries = (
        db.query(MechanicEntry)
        .filter(func.lower(MechanicEntry.vehicle_number) == vehicle_key)
        .order_by(MechanicEntry.service_date.desc())
        .all()
    )
    mechanic_total_cost = sum(float(m.cost or 0) for m in mechanic_entries)

    finance_summary = get_vehicle_finance_summary(db, vehicle_number)
    monthly_finance_total = float(finance_summary.get("monthly_finance_total", 0) or 0)

    # Driver details and salary pending
    top_driver_id = driver_counter.most_common(1)[0][0] if driver_counter else None
    assigned_driver = db.query(Driver).filter(Driver.id == top_driver_id).first() if top_driver_id else None
    salary_pending = 0.0
    driver_attendance = 0
    if assigned_driver and assigned_driver.monthly_salary:
        month_start = today.replace(day=1)
        paid_this_month = (
            db.query(func.coalesce(func.sum(DriverSalary.amount), 0))
            .filter(
                DriverSalary.driver_id == assigned_driver.id,
                DriverSalary.paid_on >= month_start,
                DriverSalary.paid_on <= today,
            )
            .scalar()
            or 0
        )
        salary_pending = max(float(assigned_driver.monthly_salary or 0) - float(paid_this_month or 0), 0)

        attendance_rows = (
            db.query(func.count(func.distinct(Trip.trip_date)))
            .join(TripVehicle, TripVehicle.trip_id == Trip.id)
            .filter(
                TripVehicle.driver_id == assigned_driver.id,
                func.lower(TripVehicle.vehicle_number) == vehicle_key,
                Trip.trip_date >= today.replace(day=1),
                Trip.trip_date <= today,
            )
            .scalar()
        )
        driver_attendance = int(attendance_rows or 0)

    # Derived analytics
    total_vehicle_cost = _round_2(trip_cost + maintenance_cost + total_fuel_cost + monthly_maintenance_cost + monthly_finance_total + mechanic_total_cost)
    total_profit_loss = _round_2(trip_cost - (maintenance_cost + total_fuel_cost + mechanic_total_cost + monthly_finance_total))
    running_cost_per_km = _round_2(total_vehicle_cost / total_km) if total_km > 0 else 0.0
    fuel_efficiency = _round_2(total_km / direct_fuel_litres) if direct_fuel_litres > 0 else 0.0

    monthly_keys = _last_six_months(today)
    monthly_expense: defaultdict[str, float] = defaultdict(float)

    for row in mechanic_entries:
        key = _month_key(row.service_date)
        if key:
            monthly_expense[key] += float(row.cost or 0)

    for row in spare_parts:
        key = _month_key(row.replaced_date)
        if key:
            monthly_expense[key] += float(row.cost or 0) * float(row.quantity or 1)

    for key, value in monthly_fuel_cost.items():
        monthly_expense[key] += value

    for key in monthly_keys:
        monthly_expense[key] += monthly_finance_total

    monthly_expense_income_graph = [
        {
            "month": key,
            "income": _round_2(monthly_income.get(key, 0)),
            "expense": _round_2(monthly_expense.get(key, 0)),
        }
        for key in monthly_keys
    ]
    profit_trend_graph = [
        {
            "month": row["month"],
            "profit": _round_2(float(row["income"]) - float(row["expense"])),
        }
        for row in monthly_expense_income_graph
    ]

    # ROI and health score
    estimated_investment = float(finance_summary.get("emi", {}).get("vehicle_purchase_price", 0) or 0)
    if estimated_investment <= 0:
        estimated_investment = float(finance_summary.get("emi", {}).get("loan_amount", 0) or 0) + float(finance_summary.get("emi", {}).get("down_payment", 0) or 0)
    roi = _round_2((total_profit_loss / estimated_investment) * 100) if estimated_investment > 0 else 0.0

    health_score = 100
    if fuel_efficiency > 0 and fuel_efficiency < 4:
        health_score -= 20
    if running_cost_per_km > 0 and running_cost_per_km > 80:
        health_score -= 15
    if finance_summary.get("emi", {}).get("overdue_installments", 0) > 0:
        health_score -= 20
    if mechanic_entries and mechanic_entries[0].service_date and mechanic_entries[0].service_date < today - timedelta(days=180):
        health_score -= 10
    health_score = max(min(health_score, 100), 0)

    # Alerts
    alerts: list[dict] = []
    for alert in finance_summary.get("alerts", []):
        alerts.append({"type": "finance", "severity": "warning", "message": alert})

    last_service_date = mechanic_entries[0].service_date if mechanic_entries else None
    next_service_due = (last_service_date + timedelta(days=90)) if last_service_date else None
    if next_service_due:
        remaining = (next_service_due - today).days
        if remaining < 0:
            alerts.append({"type": "service", "severity": "danger", "message": "Service overdue"})
        elif remaining <= 7:
            alerts.append({"type": "service", "severity": "warning", "message": f"Service due in {remaining} day(s)"})

    most_frequent_route = route_counter.most_common(1)[0][0] if route_counter else None
    avg_revenue_trip = _round_2(trip_cost / completed_trips) if completed_trips > 0 else 0.0

    driver_performance_rows = []
    if driver_counter:
        driver_lookup = {
            driver.id: driver
            for driver in db.query(Driver).filter(Driver.id.in_(list(driver_counter.keys()))).all()
        }
        for driver_id, count in driver_counter.most_common():
            driver_obj = driver_lookup.get(driver_id)
            driver_performance_rows.append(
                {
                    "driver_id": driver_id,
                    "driver_name": driver_obj.name if driver_obj else f"Driver #{driver_id}",
                    "trips": count,
                    "revenue": _round_2(driver_revenue.get(driver_id, 0)),
                    "avg_revenue": _round_2(driver_revenue.get(driver_id, 0) / count) if count > 0 else 0,
                }
            )

    breakdown_keywords = ("breakdown", "puncture", "engine", "axle", "failed")
    breakdown_history = [
        {
            "id": entry.id,
            "service_date": entry.service_date,
            "work_description": entry.work_description,
            "cost": _round_2(entry.cost),
        }
        for entry in mechanic_entries
        if any(keyword in (entry.work_description or "").lower() for keyword in breakdown_keywords)
    ]

    active_status = "active" if completed_trips > 0 and any(
        ((trip.trip_date or today) >= today - timedelta(days=30)) for trip in vehicle_trips
    ) else "inactive"

    return {
        "vehicle_number": vehicle_number,
        "total_trips": total_trips,
        "total_km": _round_2(total_km),
        "trip_cost": _round_2(trip_cost),
        "maintenance_cost": _round_2(maintenance_cost),
        "monthly_maintenance_cost": _round_2(monthly_maintenance_cost),
        "fuel_costs": fuel_costs,
        "direct_fuel_cost": _round_2(direct_fuel_cost),
        "trip_fuel_cost": _round_2(trip_fuel_cost),
        "total_fuel_cost": _round_2(total_fuel_cost),
        "total_vehicle_cost": total_vehicle_cost,
        "customers_served": customers,
        "finance_summary": finance_summary,

        "financial_details": {
            "emi_details": finance_summary.get("emi"),
            "insurance_status": finance_summary.get("insurance"),
            "tax_expiry": finance_summary.get("tax"),
            "monthly_fixed_cost": _round_2(monthly_finance_total + monthly_maintenance_cost),
            "total_profit_loss": total_profit_loss,
            "outstanding_payments": _round_2(sum(max(float(trip.pending_amount or 0), 0) for trip in vehicle_trips)),
        },

        "trip_performance": {
            "total_completed_trips": completed_trips,
            "upcoming_trips": upcoming_trips,
            "cancelled_trips": cancelled_trips,
            "most_frequent_route": most_frequent_route,
            "highest_revenue_trip": highest_trip,
            "lowest_revenue_trip": lowest_trip,
            "average_revenue_per_trip": avg_revenue_trip,
            "driver_wise_performance": driver_performance_rows,
        },

        "fuel_management": {
            "average_mileage": fuel_efficiency,
            "fuel_efficiency_km_per_l": fuel_efficiency,
            "last_fuel_entry": {
                "filled_date": fuel_rows[0].filled_date if fuel_rows else None,
                "quantity": _round_2(fuel_rows[0].quantity) if fuel_rows else None,
                "total_cost": _round_2(fuel_rows[0].total_cost) if fuel_rows else None,
                "fuel_type": fuel_rows[0].fuel_type if fuel_rows else None,
            },
            "monthly_fuel_trend": [
                {
                    "month": key,
                    "litres": _round_2(monthly_fuel_litres.get(key, 0)),
                    "expense": _round_2(monthly_fuel_cost.get(key, 0)),
                }
                for key in monthly_keys
            ],
            "fuel_expense_comparison": {
                "trip_fuel_cost": _round_2(trip_fuel_cost),
                "direct_fuel_cost": _round_2(direct_fuel_cost),
                "total_fuel_cost": _round_2(total_fuel_cost),
            },
        },

        "maintenance_section": {
            "next_service_due": next_service_due,
            "last_service_date": last_service_date,
            "service_history": [
                {
                    "id": row.id,
                    "service_date": row.service_date,
                    "work_description": row.work_description,
                    "cost": _round_2(row.cost),
                    "vendor": row.vendor,
                }
                for row in mechanic_entries[:20]
            ],
            "spare_parts_replaced": spare_parts_replaced,
            "maintenance_alerts": [item for item in alerts if item["type"] in {"service"}],
            "breakdown_history": breakdown_history,
        },

        "driver_details": {
            "assigned_driver": {
                "driver_id": assigned_driver.id,
                "name": assigned_driver.name,
                "phone": assigned_driver.phone,
                "license_number": assigned_driver.license_number,
            }
            if assigned_driver
            else None,
            "driver_performance": driver_performance_rows[:5],
            "driver_attendance": driver_attendance,
            "driver_salary_pending": _round_2(salary_pending),
        },
        "smart_dashboard": {
            "vehicle_health_score": health_score,
            "vehicle_active_status": active_status,
            "running_cost_per_km": running_cost_per_km,
            "roi": roi,
            "monthly_expense_vs_income_graph": monthly_expense_income_graph,
            "profit_trend_graph": profit_trend_graph,
        },

        "alerts_section": alerts,

        "spare_parts": [
            {
                "id": sp.id,
                "part_name": sp.part_name,
                "cost": sp.cost,
                "quantity": sp.quantity,
                "vendor": sp.vendor,
                "replaced_date": sp.replaced_date,
            }
            for sp in spare_parts
        ],
    }
