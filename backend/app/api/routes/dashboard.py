from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
import calendar

from app.database.session import SessionLocal
from app.models.driver_salary import DriverSalary
from app.models.fuel import Fuel
from app.models.maintenance import Maintenance
from app.models.mechanic import MechanicEntry
from app.models.oil_bill import OilBill, OilBillEntry
from app.models.spare_part import SparePart
from app.models.trip import Trip
from app.models.fuel import Fuel
from app.models.vehicle import Vehicle
from app.models.spare_part import SparePart
from app.models.maintenance import Maintenance
from app.models.vendor_payment import VendorPayment
from app.models.driver_salary import DriverSalary
from app.models.vendor_payment import VendorPayment
from app.models.driver_salary import DriverSalary
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
        # Pivot: Use departure_datetime if available, else fallback to trip_date
        # We compare just the date part of departure_datetime
        trip_query = trip_query.filter(
            func.coalesce(func.date(Trip.departure_datetime), Trip.trip_date).between(start_date, end_date)
        )
    total_trips = trip_query.with_entities(func.count(Trip.id)).scalar() or 0

    # -------- REVENUE --------
    income = trip_query.with_entities(func.coalesce(func.sum(Trip.total_charged), 0)).scalar()
    total_due = sum(
        max(
            (trip.total_charged or 0)
            - (trip.amount_received or 0)
            - trip.get_party_fuel_credit(),
            0,
        )
        for trip in trip_query.all()
    )
    total_due = sum(
        max(
            (trip.total_charged or 0)
            - (trip.amount_received or 0)
            - trip.get_party_fuel_credit(),
            0,
        )
        for trip in trip_query.all()
    )

    # -------- OPERATING EXPENSES --------
    trip_fuel_cost = trip_query.with_entities(
        func.coalesce(func.sum(Trip.diesel_used + Trip.petrol_used), 0)
    ).scalar()
    driver_bhatta_cost = trip_query.with_entities(
        func.coalesce(func.sum(Trip.driver_bhatta), 0)
    ).scalar()
    driver_bhatta_cost = trip_query.with_entities(
        func.coalesce(func.sum(Trip.driver_bhatta), 0)
    ).scalar()
    toll_cost = trip_query.with_entities(func.coalesce(func.sum(Trip.toll_amount), 0)).scalar()
    parking_cost = trip_query.with_entities(func.coalesce(func.sum(Trip.parking_amount), 0)).scalar()

    fuel_query = db.query(Fuel)
    if start_date and end_date:
        fuel_query = fuel_query.filter(Fuel.filled_date.between(start_date, end_date))
    vendor_fuel_cost = fuel_query.with_entities(func.coalesce(func.sum(Fuel.total_cost), 0)).scalar()

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

    driver_salary_query = db.query(DriverSalary)
    if start_date and end_date:
        driver_salary_query = driver_salary_query.filter(DriverSalary.paid_on.between(start_date, end_date))
    driver_salary_cost = driver_salary_query.with_entities(
        func.coalesce(func.sum(DriverSalary.amount), 0)
    ).scalar()

    vendor_payment_query = db.query(VendorPayment)
    if start_date and end_date:
        vendor_payment_query = vendor_payment_query.filter(VendorPayment.paid_on.between(start_date, end_date))
    vendor_payment_cost = vendor_payment_query.with_entities(
        func.coalesce(func.sum(VendorPayment.amount), 0)
    ).scalar()

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
    expenses = (
        fuel_cost
        + driver_bhatta_cost
        + maintenance_cost
        + spare_cost
        + toll_cost
        + parking_cost
        + vendor_payment_cost
        + driver_salary_cost
    )
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
