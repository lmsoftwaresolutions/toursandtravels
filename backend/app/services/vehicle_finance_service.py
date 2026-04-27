from __future__ import annotations

import calendar
from datetime import date
from math import pow

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.vehicle_emi import VehicleEMIInstallment, VehicleEMIPlan
from app.models.vehicle_insurance import VehicleInsurance
from app.models.vehicle_tax import VehicleTax
from app.schemas.vehicle_finance import EMIPlanCreate, InsuranceUpsert, TaxUpsert


EXPIRY_WARNING_DAYS = 30


def _round_2(value: float) -> float:
    return round(float(value or 0), 2)


def _normalize_vehicle_number(value: str) -> str:
    return str(value or "").upper().replace(" ", "").replace("-", "")


def _add_months(base_date: date, months: int) -> date:
    year = base_date.year + ((base_date.month - 1 + months) // 12)
    month = ((base_date.month - 1 + months) % 12) + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(base_date.day, last_day)
    return date(year, month, day)


def _ensure_vehicle_exists(db: Session, vehicle_number: str) -> str:
    normalized = _normalize_vehicle_number(vehicle_number)
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_number == normalized, Vehicle.is_deleted == False).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return normalized


def _compute_emi(loan_amount: float, annual_interest_rate: float, duration_months: int) -> float:
    principal = float(loan_amount or 0)
    rate_monthly = float(annual_interest_rate or 0) / 12 / 100
    months = int(duration_months or 0)
    if principal <= 0 or months <= 0:
        return 0.0
    if rate_monthly == 0:
        return _round_2(principal / months)
    factor = pow(1 + rate_monthly, months)
    emi = (principal * rate_monthly * factor) / (factor - 1)
    return _round_2(emi)


def _loan_amount_from_input(payload: EMIPlanCreate) -> float:
    if payload.loan_amount is not None:
        loan_amount = payload.loan_amount
    else:
        loan_amount = payload.vehicle_purchase_price - payload.down_payment
    loan_amount = _round_2(loan_amount)
    if loan_amount <= 0:
        raise HTTPException(status_code=400, detail="Loan amount must be greater than 0")
    return loan_amount


def _installment_status(installment: VehicleEMIInstallment, today: date) -> str:
    if installment.is_paid:
        return "paid"
    if installment.due_date < today:
        return "overdue"
    return "pending"


def _serialize_installment(installment: VehicleEMIInstallment, today: date) -> dict:
    return {
        "id": installment.id,
        "installment_number": installment.installment_number,
        "due_date": installment.due_date,
        "opening_balance": _round_2(installment.opening_balance),
        "principal_component": _round_2(installment.principal_component),
        "interest_component": _round_2(installment.interest_component),
        "amount_due": _round_2(installment.amount_due),
        "closing_balance": _round_2(installment.closing_balance),
        "paid_amount": _round_2(installment.paid_amount),
        "paid_on": installment.paid_on,
        "is_paid": bool(installment.is_paid),
        "status": _installment_status(installment, today),
    }


def _serialize_emi_plan(plan: VehicleEMIPlan | None, today: date) -> dict | None:
    if not plan:
        return None
    installments = sorted(plan.installments, key=lambda i: i.installment_number)
    paid = 0
    pending = 0
    overdue = 0
    remaining = 0.0
    serialized_installments: list[dict] = []
    for installment in installments:
        status = _installment_status(installment, today)
        if status == "paid":
            paid += 1
        elif status == "overdue":
            overdue += 1
        else:
            pending += 1
        if not installment.is_paid:
            remaining += max((installment.amount_due or 0) - (installment.paid_amount or 0), 0)
        serialized = _serialize_installment(installment, today)
        serialized_installments.append(serialized)
    return {
        "id": plan.id,
        "vehicle_number": plan.vehicle_number,
        "vehicle_purchase_price": _round_2(plan.vehicle_purchase_price),
        "down_payment": _round_2(plan.down_payment),
        "loan_amount": _round_2(plan.loan_amount),
        "annual_interest_rate": _round_2(plan.annual_interest_rate),
        "loan_duration_months": int(plan.loan_duration_months or 0),
        "emi_start_date": plan.emi_start_date,
        "emi_end_date": plan.emi_end_date,
        "monthly_emi": _round_2(plan.monthly_emi),
        "paid_installments": paid,
        "pending_installments": pending,
        "overdue_installments": overdue,
        "total_remaining_balance": _round_2(remaining),
        "installments": serialized_installments,
    }


def _insurance_status(record: VehicleInsurance | None, today: date) -> tuple[int, str]:
    if not record:
        return 0, "missing"
    remaining_days = (record.end_date - today).days
    if remaining_days < 0:
        return remaining_days, "expired"
    if remaining_days <= EXPIRY_WARNING_DAYS:
        return remaining_days, "expiring_soon"
    return remaining_days, "active"


def _tax_status(record: VehicleTax | None, today: date) -> tuple[int, str]:
    if not record:
        return 0, "missing"
    remaining_days = (record.tax_expiry_date - today).days
    if remaining_days < 0:
        return remaining_days, "expired"
    if remaining_days <= EXPIRY_WARNING_DAYS:
        return remaining_days, "expiring_soon"
    return remaining_days, "active"


def _serialize_insurance(record: VehicleInsurance | None, today: date) -> dict | None:
    if not record:
        return None
    remaining_days, status = _insurance_status(record, today)
    return {
        "id": record.id,
        "vehicle_number": record.vehicle_number,
        "provider_name": record.provider_name,
        "policy_number": record.policy_number,
        "insurance_type": record.insurance_type,
        "start_date": record.start_date,
        "end_date": record.end_date,
        "total_insurance_amount": _round_2(record.total_insurance_amount),
        "monthly_insurance_cost": _round_2(record.monthly_insurance_cost),
        "renewal_status": record.renewal_status,
        "remaining_days": remaining_days,
        "status": status,
    }


def _serialize_tax(record: VehicleTax | None, today: date) -> dict | None:
    if not record:
        return None
    remaining_days, status = _tax_status(record, today)
    return {
        "id": record.id,
        "vehicle_number": record.vehicle_number,
        "road_tax": _round_2(record.road_tax),
        "permit_tax": _round_2(record.permit_tax),
        "fitness_tax": _round_2(record.fitness_tax),
        "pollution_tax": _round_2(record.pollution_tax),
        "permit_charges": _round_2(record.permit_charges),
        "other_taxes": _round_2(record.other_taxes),
        "tax_start_date": record.tax_start_date,
        "tax_expiry_date": record.tax_expiry_date,
        "annual_total_tax": _round_2(record.annual_total_tax),
        "monthly_tax_cost": _round_2(record.monthly_tax_cost),
        "renewal_status": record.renewal_status,
        "remaining_days": remaining_days,
        "status": status,
    }


def upsert_vehicle_emi_plan(db: Session, vehicle_number: str, payload: EMIPlanCreate) -> dict:
    normalized_vehicle_number = _ensure_vehicle_exists(db, vehicle_number)
    loan_amount = _loan_amount_from_input(payload)
    monthly_emi = _compute_emi(loan_amount, payload.annual_interest_rate, payload.loan_duration_months)
    emi_end_date = _add_months(payload.emi_start_date, payload.loan_duration_months - 1)

    (
        db.query(VehicleEMIPlan)
        .filter(VehicleEMIPlan.vehicle_number == normalized_vehicle_number, VehicleEMIPlan.is_active == True)
        .update({"is_active": False})
    )

    plan = VehicleEMIPlan(
        vehicle_number=normalized_vehicle_number,
        vehicle_purchase_price=_round_2(payload.vehicle_purchase_price),
        down_payment=_round_2(payload.down_payment),
        loan_amount=_round_2(loan_amount),
        annual_interest_rate=_round_2(payload.annual_interest_rate),
        loan_duration_months=payload.loan_duration_months,
        emi_start_date=payload.emi_start_date,
        emi_end_date=emi_end_date,
        monthly_emi=_round_2(monthly_emi),
        is_active=True,
    )
    db.add(plan)
    db.flush()

    balance = float(loan_amount)
    monthly_rate = float(payload.annual_interest_rate) / 12 / 100
    for installment_number in range(1, payload.loan_duration_months + 1):
        due_date = _add_months(payload.emi_start_date, installment_number - 1)
        opening_balance = _round_2(balance)
        interest_component = _round_2(balance * monthly_rate) if monthly_rate > 0 else 0.0
        principal_component = _round_2(monthly_emi - interest_component)
        if installment_number == payload.loan_duration_months:
            principal_component = _round_2(balance)
        principal_component = max(principal_component, 0.0)
        amount_due = _round_2(principal_component + interest_component)
        closing_balance = _round_2(max(balance - principal_component, 0.0))
        db.add(
            VehicleEMIInstallment(
                emi_plan_id=plan.id,
                installment_number=installment_number,
                due_date=due_date,
                opening_balance=opening_balance,
                principal_component=principal_component,
                interest_component=interest_component,
                amount_due=amount_due,
                closing_balance=closing_balance,
            )
        )
        balance = closing_balance

    db.commit()
    db.refresh(plan)
    _ = plan.installments
    return _serialize_emi_plan(plan, date.today()) or {}


def pay_emi_installment(
    db: Session,
    installment_id: int,
    paid_amount: float | None = None,
    paid_on: date | None = None,
) -> dict:
    installment = db.query(VehicleEMIInstallment).filter(VehicleEMIInstallment.id == installment_id).first()
    if not installment:
        raise HTTPException(status_code=404, detail="EMI installment not found")

    pay_amount = paid_amount if paid_amount is not None else installment.amount_due
    if pay_amount < 0:
        raise HTTPException(status_code=400, detail="Paid amount cannot be negative")

    installment.paid_amount = _round_2(pay_amount)
    installment.paid_on = paid_on or date.today()
    installment.is_paid = installment.paid_amount >= (installment.amount_due or 0) - 0.01
    db.commit()
    db.refresh(installment)

    return _serialize_installment(installment, date.today())


def upsert_vehicle_insurance(db: Session, vehicle_number: str, payload: InsuranceUpsert) -> dict:
    normalized_vehicle_number = _ensure_vehicle_exists(db, vehicle_number)

    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="Insurance end date cannot be before start date")

    (
        db.query(VehicleInsurance)
        .filter(VehicleInsurance.vehicle_number == normalized_vehicle_number, VehicleInsurance.is_active == True)
        .update({"is_active": False})
    )

    monthly_cost = _round_2(payload.total_insurance_amount / 12) if payload.total_insurance_amount else 0.0
    record = VehicleInsurance(
        vehicle_number=normalized_vehicle_number,
        provider_name=payload.provider_name.strip(),
        policy_number=payload.policy_number.strip(),
        insurance_type=payload.insurance_type.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        total_insurance_amount=_round_2(payload.total_insurance_amount),
        monthly_insurance_cost=monthly_cost,
        renewal_status=(payload.renewal_status or "pending").strip().lower(),
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize_insurance(record, date.today()) or {}


def upsert_vehicle_tax(db: Session, vehicle_number: str, payload: TaxUpsert) -> dict:
    normalized_vehicle_number = _ensure_vehicle_exists(db, vehicle_number)

    if payload.tax_expiry_date < payload.tax_start_date:
        raise HTTPException(status_code=400, detail="Tax expiry date cannot be before tax start date")

    (
        db.query(VehicleTax)
        .filter(VehicleTax.vehicle_number == normalized_vehicle_number, VehicleTax.is_active == True)
        .update({"is_active": False})
    )

    annual_total = _round_2(payload.annual_total_tax)
    monthly_tax = _round_2(annual_total / 12) if annual_total else 0.0
    record = VehicleTax(
        vehicle_number=normalized_vehicle_number,
        road_tax=_round_2(payload.road_tax),
        permit_tax=_round_2(payload.permit_tax),
        fitness_tax=_round_2(payload.fitness_tax),
        pollution_tax=_round_2(payload.pollution_tax),
        permit_charges=_round_2(payload.permit_charges),
        other_taxes=_round_2(payload.other_taxes),
        tax_start_date=payload.tax_start_date,
        tax_expiry_date=payload.tax_expiry_date,
        annual_total_tax=annual_total,
        monthly_tax_cost=monthly_tax,
        renewal_status=(payload.renewal_status or "pending").strip().lower(),
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize_tax(record, date.today()) or {}


def get_vehicle_finance_summary(db: Session, vehicle_number: str) -> dict:
    normalized_vehicle_number = _ensure_vehicle_exists(db, vehicle_number)
    today = date.today()

    emi_plan = (
        db.query(VehicleEMIPlan)
        .filter(VehicleEMIPlan.vehicle_number == normalized_vehicle_number, VehicleEMIPlan.is_active == True)
        .order_by(VehicleEMIPlan.created_at.desc())
        .first()
    )
    if emi_plan:
        _ = emi_plan.installments
    insurance = (
        db.query(VehicleInsurance)
        .filter(VehicleInsurance.vehicle_number == normalized_vehicle_number, VehicleInsurance.is_active == True)
        .order_by(VehicleInsurance.created_at.desc())
        .first()
    )
    tax = (
        db.query(VehicleTax)
        .filter(VehicleTax.vehicle_number == normalized_vehicle_number, VehicleTax.is_active == True)
        .order_by(VehicleTax.created_at.desc())
        .first()
    )

    emi_payload = _serialize_emi_plan(emi_plan, today)
    insurance_payload = _serialize_insurance(insurance, today)
    tax_payload = _serialize_tax(tax, today)

    monthly_total = 0.0
    alerts: list[str] = []
    if emi_payload:
        monthly_total += float(emi_payload["monthly_emi"])
        if emi_payload["overdue_installments"] > 0:
            alerts.append(f"EMI overdue: {emi_payload['overdue_installments']} installment(s)")
    if insurance_payload:
        monthly_total += float(insurance_payload["monthly_insurance_cost"])
        if insurance_payload["status"] == "expired":
            alerts.append("Insurance is expired")
        elif insurance_payload["status"] == "expiring_soon":
            alerts.append(f"Insurance expires in {insurance_payload['remaining_days']} day(s)")
    if tax_payload:
        monthly_total += float(tax_payload["monthly_tax_cost"])
        if tax_payload["status"] == "expired":
            alerts.append("Tax is expired")
        elif tax_payload["status"] == "expiring_soon":
            alerts.append(f"Tax expires in {tax_payload['remaining_days']} day(s)")

    return {
        "vehicle_number": normalized_vehicle_number,
        "emi": emi_payload,
        "insurance": insurance_payload,
        "tax": tax_payload,
        "monthly_finance_total": _round_2(monthly_total),
        "alert_count": len(alerts),
        "alerts": alerts,
    }


def get_finance_dashboard_summary(db: Session) -> dict:
    today = date.today()
    active_emi_plans = db.query(VehicleEMIPlan).filter(VehicleEMIPlan.is_active == True).all()
    active_insurance = db.query(VehicleInsurance).filter(VehicleInsurance.is_active == True).all()
    active_taxes = db.query(VehicleTax).filter(VehicleTax.is_active == True).all()

    emi_paid = 0
    emi_pending = 0
    emi_overdue = 0
    monthly_emi_outflow = 0.0
    for plan in active_emi_plans:
        monthly_emi_outflow += float(plan.monthly_emi or 0)
        for installment in plan.installments:
            status = _installment_status(installment, today)
            if status == "paid":
                emi_paid += 1
            elif status == "overdue":
                emi_overdue += 1
            else:
                emi_pending += 1

    insurance_expiring_soon = 0
    insurance_expired = 0
    monthly_insurance_outflow = 0.0
    alert_cards: list[dict] = []
    for record in active_insurance:
        monthly_insurance_outflow += float(record.monthly_insurance_cost or 0)
        remaining_days, status = _insurance_status(record, today)
        if status == "expired":
            insurance_expired += 1
            alert_cards.append(
                {
                    "type": "insurance",
                    "vehicle_number": record.vehicle_number,
                    "severity": "danger",
                    "message": f"Insurance expired {abs(remaining_days)} day(s) ago",
                    "remaining_days": remaining_days,
                }
            )
        elif status == "expiring_soon":
            insurance_expiring_soon += 1
            alert_cards.append(
                {
                    "type": "insurance",
                    "vehicle_number": record.vehicle_number,
                    "severity": "warning",
                    "message": f"Insurance expires in {remaining_days} day(s)",
                    "remaining_days": remaining_days,
                }
            )

    tax_expiring_soon = 0
    tax_expired = 0
    monthly_tax_outflow = 0.0
    for record in active_taxes:
        monthly_tax_outflow += float(record.monthly_tax_cost or 0)
        remaining_days, status = _tax_status(record, today)
        if status == "expired":
            tax_expired += 1
            alert_cards.append(
                {
                    "type": "tax",
                    "vehicle_number": record.vehicle_number,
                    "severity": "danger",
                    "message": f"Tax expired {abs(remaining_days)} day(s) ago",
                    "remaining_days": remaining_days,
                }
            )
        elif status == "expiring_soon":
            tax_expiring_soon += 1
            alert_cards.append(
                {
                    "type": "tax",
                    "vehicle_number": record.vehicle_number,
                    "severity": "warning",
                    "message": f"Tax expires in {remaining_days} day(s)",
                    "remaining_days": remaining_days,
                }
            )

    vehicle_numbers = sorted(
        {
            *(plan.vehicle_number for plan in active_emi_plans),
            *(row.vehicle_number for row in active_insurance),
            *(row.vehicle_number for row in active_taxes),
        }
    )
    vehicle_wise_expenses: list[dict] = []
    for vehicle_number in vehicle_numbers:
        plan = next((row for row in active_emi_plans if row.vehicle_number == vehicle_number), None)
        insurance = next((row for row in active_insurance if row.vehicle_number == vehicle_number), None)
        tax = next((row for row in active_taxes if row.vehicle_number == vehicle_number), None)
        monthly_emi = float(plan.monthly_emi or 0) if plan else 0
        monthly_insurance = float(insurance.monthly_insurance_cost or 0) if insurance else 0
        monthly_tax = float(tax.monthly_tax_cost or 0) if tax else 0
        vehicle_wise_expenses.append(
            {
                "vehicle_number": vehicle_number,
                "monthly_emi": _round_2(monthly_emi),
                "monthly_insurance": _round_2(monthly_insurance),
                "monthly_tax": _round_2(monthly_tax),
                "total_monthly_finance": _round_2(monthly_emi + monthly_insurance + monthly_tax),
            }
        )

    total_monthly_finance = monthly_emi_outflow + monthly_insurance_outflow + monthly_tax_outflow
    return {
        "emi_pending_installments": emi_pending,
        "emi_paid_installments": emi_paid,
        "emi_overdue_installments": emi_overdue,
        "insurance_expiring_soon": insurance_expiring_soon,
        "insurance_expired": insurance_expired,
        "tax_expiring_soon": tax_expiring_soon,
        "tax_expired": tax_expired,
        "total_monthly_emi_outflow": _round_2(monthly_emi_outflow),
        "total_monthly_insurance_outflow": _round_2(monthly_insurance_outflow),
        "total_monthly_tax_outflow": _round_2(monthly_tax_outflow),
        "total_monthly_finance_outflow": _round_2(total_monthly_finance),
        "alert_cards": alert_cards[:50],
        "vehicle_wise_expenses": vehicle_wise_expenses,
    }
