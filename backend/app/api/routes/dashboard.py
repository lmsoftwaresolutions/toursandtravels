import calendar
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.database.session import SessionLocal
from app.models.driver_salary import DriverSalary
from app.models.fuel import Fuel
from app.models.maintenance import Maintenance
from app.models.mechanic import MechanicEntry
from app.models.oil_bill import OilBill, OilBillEntry
from app.models.spare_part import SparePart
from app.models.trip import Trip
from app.models.fuel import Fuel
from app.models.maintenance import Maintenance
from app.models.mechanic import MechanicEntry
from app.models.spare_part import SparePart
from app.models.trip import Trip
from app.models.trip_vehicle import TripVehicle
from app.models.vehicle import Vehicle
from app.models.vendor_payment import VendorPayment
from app.services.auth_service import get_current_user
from app.services.vehicle_finance_service import get_finance_dashboard_summary

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
    start_date: date | None = None
    end_date: date | None = None
    if month:
        try:
            year, mon = map(int, month.split("-"))
            last_day = calendar.monthrange(year, mon)[1]
            start_date = date(year, mon, 1)
            end_date = date(year, mon, last_day)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM") from exc

    today = date.today()

    def is_aware(value: datetime | None) -> bool:
        return bool(value and value.tzinfo and value.tzinfo.utcoffset(value) is not None)

    def align_datetime(value: datetime, target_tz) -> datetime:
        if target_tz is None:
            return value.replace(tzinfo=None) if is_aware(value) else value
        if is_aware(value):
            return value.astimezone(target_tz)
        return value.replace(tzinfo=target_tz)

    def within_range(value: date | None) -> bool:
        if not value:
            return True
        if start_date and value < start_date:
            return False
        if end_date and value > end_date:
            return False
        return True

    def trip_effective_date(trip: Trip) -> date | None:
        if trip.departure_datetime:
            return trip.departure_datetime.date()
        return trip.trip_date

    def safe_amount(value: float | None) -> float:
        return round(float(value or 0), 2)

    def classify_charge_item(description: str) -> str:
        d = (description or "").strip().lower()
        if "night" in d:
            return "night_charges"
        if "wait" in d:
            return "waiting_charges"
        if "add" in d or "extra" in d:
            return "additional_charges"
        return "other_additional_charges"

    trip_query = db.query(Trip).options(
        selectinload(Trip.pricing_items),
        selectinload(Trip.vehicles).selectinload(TripVehicle.expenses),
    )
    if start_date and end_date:
        trip_query = trip_query.filter(
            func.coalesce(func.date(Trip.departure_datetime), Trip.trip_date).between(start_date, end_date)
        )
    trips = trip_query.all()

    total_trips = len(trips)
    completed_trips = 0
    upcoming_trips = 0
    ongoing_trips = 0

    invoice_revenue = 0.0
    paid_amount = 0.0
    pending_amount = 0.0
    partial_payments = 0
    unpaid_invoices = 0
    pending_customer_payments = 0

    invoice_custom_pricing = 0.0
    charged_toll_recovery = 0.0
    charged_parking_recovery = 0.0
    night_charges = 0.0
    waiting_charges = 0.0
    additional_charges = 0.0
    other_additional_charges = 0.0
    discount_total = 0.0

    trip_fuel_cost = 0.0
    driver_bhatta_cost = 0.0
    toll_cost = 0.0
    parking_cost = 0.0
    daily_running_expense = 0.0

    for trip in trips:
        effective_date = trip_effective_date(trip)
        if trip.departure_datetime and trip.return_datetime:
            dep = trip.departure_datetime
            ret = trip.return_datetime
            target_tz = dep.tzinfo if is_aware(dep) else (ret.tzinfo if is_aware(ret) else None)
            dep_cmp = align_datetime(dep, target_tz)
            ret_cmp = align_datetime(ret, target_tz)
            now_cmp = datetime.now(target_tz) if target_tz else datetime.now()
            if dep_cmp <= now_cmp <= ret_cmp:
                ongoing_trips += 1
            elif dep_cmp > now_cmp:
                upcoming_trips += 1
            else:
                completed_trips += 1
        elif effective_date and effective_date > today:
            upcoming_trips += 1
        else:
            completed_trips += 1

        charged = safe_amount(trip.total_charged)
        party_fuel_credit = safe_amount(trip.get_party_fuel_credit())
        received = safe_amount(trip.amount_received) + party_fuel_credit
        due = max(charged - received, 0)

        invoice_revenue += charged
        paid_amount += received
        pending_amount += due
        if due > 0:
            pending_customer_payments += 1
            if received <= 0:
                unpaid_invoices += 1
            else:
                partial_payments += 1

        number_of_vehicles = max(int(trip.number_of_vehicles or 1), 1)
        pricing_total = 0.0
        for item in trip.pricing_items or []:
            base_amount = safe_amount(item.amount) if item.amount else safe_amount((item.quantity or 1) * (item.rate or 0))
            if item.item_type == "pricing":
                pricing_total += base_amount * number_of_vehicles
            elif item.item_type == "charge":
                tag = classify_charge_item(item.description or "")
                if tag == "night_charges":
                    night_charges += base_amount
                elif tag == "waiting_charges":
                    waiting_charges += base_amount
                elif tag == "additional_charges":
                    additional_charges += base_amount
                else:
                    other_additional_charges += base_amount

        invoice_custom_pricing += pricing_total
        charged_toll_recovery += safe_amount(trip.charged_toll_amount)
        charged_parking_recovery += safe_amount(trip.charged_parking_amount)
        discount_total += safe_amount(trip.discount_amount)

        trip_fuel_cost += safe_amount(trip.diesel_used) + safe_amount(trip.petrol_used)
        driver_bhatta_cost += safe_amount(trip.driver_bhatta)
        toll_cost += safe_amount(trip.toll_amount)
        parking_cost += safe_amount(trip.parking_amount)
        daily_running_expense += safe_amount(trip.other_expenses)

    fuel_query = db.query(Fuel)
    if start_date and end_date:
        fuel_query = fuel_query.filter(Fuel.filled_date.between(start_date, end_date))
    direct_fuel_cost = safe_amount(
        fuel_query.with_entities(func.coalesce(func.sum(Fuel.total_cost), 0)).scalar()
    )

    maintenance_query = db.query(Maintenance)
    if start_date and end_date:
        maintenance_query = maintenance_query.filter(
            Maintenance.start_date.between(
                datetime.combine(start_date, datetime.min.time()),
                datetime.combine(end_date, datetime.max.time()),
            )
        )
    maintenance_cost = safe_amount(
        maintenance_query.with_entities(func.coalesce(func.sum(Maintenance.amount), 0)).scalar()
    )

    spare_query = db.query(SparePart)
    if start_date and end_date:
        spare_query = spare_query.filter(SparePart.replaced_date.between(start_date, end_date))
    spare_cost = spare_query.with_entities(
        func.coalesce(func.sum(SparePart.cost * SparePart.quantity), 0)
    ).scalar()

    oil_query = db.query(OilBillEntry).join(OilBill, OilBill.id == OilBillEntry.oil_bill_id)
    if start_date and end_date:
        oil_query = oil_query.filter(OilBill.bill_date.between(start_date, end_date))
    oil_cost = safe_amount(
        oil_query.with_entities(func.coalesce(func.sum(OilBillEntry.total_amount), 0)).scalar()
    )

    vendor_payment_query = db.query(VendorPayment)
    if start_date and end_date:
        vendor_payment_query = vendor_payment_query.filter(VendorPayment.paid_on.between(start_date, end_date))
    vendor_payment_cost = vendor_payment_query.with_entities(
        func.coalesce(func.sum(VendorPayment.amount), 0)
    ).scalar()

    mechanic_query = db.query(MechanicEntry)
    if start_date and end_date:
        mechanic_query = mechanic_query.filter(MechanicEntry.service_date.between(start_date, end_date))
    mechanic_cost = safe_amount(
        mechanic_query.with_entities(func.coalesce(func.sum(MechanicEntry.cost), 0)).scalar()
    )

    vendor_payment_query = db.query(VendorPayment)
    if start_date and end_date:
        vendor_payment_query = vendor_payment_query.filter(VendorPayment.paid_on.between(start_date, end_date))
    vendor_payment_cost = safe_amount(
        vendor_payment_query.with_entities(func.coalesce(func.sum(VendorPayment.amount), 0)).scalar()
    )

    driver_salary_query = db.query(DriverSalary)
    if start_date and end_date:
        driver_salary_query = driver_salary_query.filter(DriverSalary.paid_on.between(start_date, end_date))
    driver_salary_cost = driver_salary_query.with_entities(
        func.coalesce(func.sum(DriverSalary.amount), 0)
    ).scalar()

    fuel_cost = trip_fuel_cost + vendor_fuel_cost
    expenses = (
        fuel_cost
        + driver_bhatta_cost
        + maintenance_cost
        + spare_cost
        + toll_cost
        + parking_cost
        + maintenance_cost
        + spare_parts_cost
        + mechanic_cost
        + oil_cost
        + daily_running_expense
        + vendor_payment_cost
        + driver_salary_cost
    )

    total_fuel_cost = safe_amount(trip_fuel_cost + direct_fuel_cost)
    total_driver_payment = safe_amount(driver_bhatta_cost + driver_salary_cost)
    operating_expense = safe_amount(
        total_fuel_cost
        + total_driver_payment
        + toll_cost
        + parking_cost
        + maintenance_cost
        + spare_parts_cost
        + mechanic_cost
        + daily_running_expense
        + vendor_payment_cost
    )

    net_profit = safe_amount(invoice_revenue - operating_expense)
    finance_summary = get_finance_dashboard_summary(db)
    monthly_finance_outflow = safe_amount(finance_summary.get("total_monthly_finance_outflow", 0))
    monthly_expense = safe_amount(operating_expense + monthly_finance_outflow)
    fixed_vehicle_expenses = 0.0
    actual_profit = safe_amount(
        invoice_revenue
        - (operating_expense + monthly_finance_outflow + fixed_vehicle_expenses)
    )

    vehicles = db.query(Vehicle).filter(Vehicle.is_deleted == False).all()
    vehicle_summary = [
        {
            "id": v.id,
            "vehicle_number": v.vehicle_number,
            "maintenance_cost": safe_amount(v.total_maintenance_cost),
        }
        for v in vehicles
    ]

    base_fare = max(
        invoice_revenue
        - invoice_custom_pricing
        - charged_toll_recovery
        - charged_parking_recovery
        - night_charges
        - waiting_charges
        - additional_charges
        - other_additional_charges
        - daily_running_expense
        + discount_total,
        0,
    )

    return {
        # Backward-compatible keys
        "trips": total_trips,
        "income": safe_amount(invoice_revenue),
        "expenses": operating_expense,
        "profit": net_profit,
        "total_due": safe_amount(pending_amount),
        "vehicles": vehicle_summary,

        # Expanded dashboard payload
        "trip_status_counts": {
            "total_trips": total_trips,
            "completed_trips": completed_trips,
            "upcoming_trips": upcoming_trips,
            "ongoing_trips": ongoing_trips,
        },
        "revenue_breakdown": {
            "base_fare": safe_amount(base_fare),
            "custom_pricing": safe_amount(invoice_custom_pricing),
            "charged_toll_recovery": safe_amount(charged_toll_recovery),
            "charged_parking_recovery": safe_amount(charged_parking_recovery),
            "night_charges": safe_amount(night_charges),
            "waiting_charges": safe_amount(waiting_charges),
            "additional_charges": safe_amount(additional_charges),
            "other_additional_charges": safe_amount(other_additional_charges),
            "discount": safe_amount(discount_total),
            "invoice_revenue": safe_amount(invoice_revenue),
            "customer_payment_received": safe_amount(paid_amount),
        },
        "operating_expense_breakdown": {
            "trip_fuel_cost": safe_amount(trip_fuel_cost),
            "direct_fuel_cost": safe_amount(direct_fuel_cost),
            "fuel_cost": total_fuel_cost,
            "driver_bhatta_cost": safe_amount(driver_bhatta_cost),
            "driver_salary_cost": safe_amount(driver_salary_cost),
            "driver_payment": total_driver_payment,
            "toll_charges": safe_amount(toll_cost),
            "parking_charges": safe_amount(parking_cost),
            "maintenance_cost": safe_amount(maintenance_cost),
            "spare_parts_cost": safe_amount(spare_parts_cost),
            "mechanic_cost": safe_amount(mechanic_cost),
            "oil_cost": safe_amount(oil_cost),
            "daily_running_expenses": safe_amount(daily_running_expense),
            "vendor_payments": safe_amount(vendor_payment_cost),
            "total_operating_expense": operating_expense,
        },
        "balance_due_breakdown": {
            "total_invoice_amount": safe_amount(invoice_revenue),
            "received_payment": safe_amount(paid_amount),
            "balance_due": safe_amount(pending_amount),
            "pending_customer_payments": pending_customer_payments,
            "partial_payments": partial_payments,
            "unpaid_invoices": unpaid_invoices,
        },
        "monthly_finance_summary": {
            "operating_expense": operating_expense,
            "monthly_emi": safe_amount(finance_summary.get("total_monthly_emi_outflow", 0)),
            "monthly_insurance": safe_amount(finance_summary.get("total_monthly_insurance_outflow", 0)),
            "monthly_tax": safe_amount(finance_summary.get("total_monthly_tax_outflow", 0)),
            "permit_charges": 0.0,
            "monthly_expense": monthly_expense,
        },
        "dashboard_summary_cards": {
            "total_trips": total_trips,
            "total_revenue": safe_amount(invoice_revenue),
            "total_expenses": operating_expense,
            "net_profit": net_profit,
            "pending_payments": safe_amount(pending_amount),
            "vehicle_alerts": len(finance_summary.get("alert_cards", [])),
            "insurance_expiry": int(finance_summary.get("insurance_expiring_soon", 0)) + int(finance_summary.get("insurance_expired", 0)),
            "emi_due": int(finance_summary.get("emi_pending_installments", 0)) + int(finance_summary.get("emi_overdue_installments", 0)),
            "tax_due": int(finance_summary.get("tax_expiring_soon", 0)) + int(finance_summary.get("tax_expired", 0)),
        },
        "net_profit": net_profit,
        "actual_profit": actual_profit,
        "fixed_vehicle_expenses": fixed_vehicle_expenses,
        "finance_dashboard": finance_summary,
    }
