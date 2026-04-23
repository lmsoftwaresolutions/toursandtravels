from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.schemas.vehicle_finance import (
    EMIPaymentCreate,
    EMIPlanCreate,
    EMIPlanResponse,
    FinanceDashboardSummary,
    FinanceVehicleSummary,
    InsuranceResponse,
    InsuranceUpsert,
    TaxResponse,
    TaxUpsert,
)
from app.services.auth_service import require_write_access
from app.services.vehicle_finance_service import (
    get_finance_dashboard_summary,
    get_vehicle_finance_summary,
    pay_emi_installment,
    upsert_vehicle_emi_plan,
    upsert_vehicle_insurance,
    upsert_vehicle_tax,
)

router = APIRouter(prefix="/vehicle-finance", tags=["Vehicle Finance"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/vehicle/{vehicle_number}", response_model=FinanceVehicleSummary)
def vehicle_finance_summary(vehicle_number: str, db: Session = Depends(get_db)):
    return get_vehicle_finance_summary(db, vehicle_number)


@router.post("/vehicle/{vehicle_number}/emi", response_model=EMIPlanResponse)
def save_vehicle_emi(
    vehicle_number: str,
    payload: EMIPlanCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_write_access),
):
    return upsert_vehicle_emi_plan(db, vehicle_number, payload)


@router.post("/emi-installments/{installment_id}/pay")
def pay_installment(
    installment_id: int,
    payload: EMIPaymentCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(require_write_access),
):
    return pay_emi_installment(db, installment_id, payload.paid_amount, payload.paid_on)


@router.post("/vehicle/{vehicle_number}/insurance", response_model=InsuranceResponse)
def save_vehicle_insurance(
    vehicle_number: str,
    payload: InsuranceUpsert,
    db: Session = Depends(get_db),
    _current_user=Depends(require_write_access),
):
    return upsert_vehicle_insurance(db, vehicle_number, payload)


@router.post("/vehicle/{vehicle_number}/tax", response_model=TaxResponse)
def save_vehicle_tax(
    vehicle_number: str,
    payload: TaxUpsert,
    db: Session = Depends(get_db),
    _current_user=Depends(require_write_access),
):
    return upsert_vehicle_tax(db, vehicle_number, payload)


@router.get("/dashboard-summary", response_model=FinanceDashboardSummary)
def finance_dashboard_summary(db: Session = Depends(get_db)):
    return get_finance_dashboard_summary(db)
