from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.models.driver import Driver
from app.models.driver_salary import DriverSalary
from app.models.fuel import Fuel
from app.models.mechanic import MechanicEntry
from app.models.oil_bill import OilBill, OilBillEntry
from app.models.spare_part import SparePart
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
    spare_parts_replaced = len(spare_parts)

    oil_entries = (
        db.query(OilBillEntry, OilBill.bill_date.label("bill_date"))
        .join(OilBill, OilBill.id == OilBillEntry.oil_bill_id)
        .filter(func.lower(OilBillEntry.vehicle_number) == vehicle_key)
        .order_by(OilBill.bill_date.desc())
        .all()
    )
    oil_total_cost = sum(float(entry.total_amount or 0) for entry, _ in oil_entries)

    mechanic_entries = (
        db.query(MechanicEntry)
        .filter(func.lower(MechanicEntry.vehicle_number) == vehicle_key)
        .order_by(MechanicEntry.service_date.desc())
        .all()
    )
    mechanic_total_cost = sum(float(m.cost or 0) for m in mechanic_entries)

    finance_summary = get_vehicle_finance_summary(db, vehicle_number)
    emi_details = finance_summary.get("emi") or {}
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
    total_vehicle_cost = _round_2(
        trip_cost + maintenance_cost + total_fuel_cost + monthly_maintenance_cost + monthly_finance_total + mechanic_total_cost + oil_total_cost
    )
    total_profit_loss = _round_2(trip_cost - (maintenance_cost + total_fuel_cost + mechanic_total_cost + oil_total_cost + monthly_finance_total))
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

    for row, bill_date in oil_entries:
        key = _month_key(bill_date)
        if key:
            monthly_expense[key] += float(row.total_amount or 0)

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
    estimated_investment = float(emi_details.get("vehicle_purchase_price", 0) or 0)
    if estimated_investment <= 0:
        estimated_investment = float(emi_details.get("loan_amount", 0) or 0) + float(emi_details.get("down_payment", 0) or 0)
    roi = _round_2((total_profit_loss / estimated_investment) * 100) if estimated_investment > 0 else 0.0

    health_score = 100
    if fuel_efficiency > 0 and fuel_efficiency < 4:
        health_score -= 20
    if running_cost_per_km > 0 and running_cost_per_km > 80:
        health_score -= 15
    if emi_details.get("overdue_installments", 0) > 0:
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
            "oil_entries_count": len(oil_entries),
            "oil_total_cost": _round_2(oil_total_cost),
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
        ],
        "oil_entries": [
            {
                "id": entry.id,
                "bill_id": entry.oil_bill_id,
                "bill_date": bill_date,
                "particular_name": entry.particular_name,
                "liters": _round_2(entry.liters),
                "rate": _round_2(entry.rate),
                "total_amount": _round_2(entry.total_amount),
                "note": entry.note,
            }
            for entry, bill_date in oil_entries
        ],
    }
