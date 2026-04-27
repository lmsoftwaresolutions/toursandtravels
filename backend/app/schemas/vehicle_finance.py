from datetime import date

from pydantic import BaseModel, Field, computed_field, field_validator


def _round_2(value: float) -> float:
    return round(float(value or 0), 2)


class EMIPaymentCreate(BaseModel):
    paid_amount: float | None = Field(default=None, ge=0)
    paid_on: date | None = None


class EMIPlanCreate(BaseModel):
    vehicle_purchase_price: float = Field(..., ge=0)
    down_payment: float = Field(default=0, ge=0)
    loan_amount: float | None = Field(default=None, ge=0)
    annual_interest_rate: float = Field(default=0, ge=0)
    loan_duration_months: int = Field(..., ge=1, le=600)
    emi_start_date: date

    @field_validator("loan_amount")
    @classmethod
    def normalize_loan_amount(cls, value: float | None) -> float | None:
        return _round_2(value) if value is not None else value


class EMIInstallmentResponse(BaseModel):
    id: int
    installment_number: int
    due_date: date
    opening_balance: float
    principal_component: float
    interest_component: float
    amount_due: float
    closing_balance: float
    paid_amount: float
    paid_on: date | None = None
    is_paid: bool
    status: str

    model_config = {"from_attributes": True}


class EMIPlanResponse(BaseModel):
    id: int
    vehicle_number: str
    vehicle_purchase_price: float
    down_payment: float
    loan_amount: float
    annual_interest_rate: float
    loan_duration_months: int
    emi_start_date: date
    emi_end_date: date
    monthly_emi: float
    paid_installments: int
    pending_installments: int
    overdue_installments: int
    total_remaining_balance: float
    installments: list[EMIInstallmentResponse]

    model_config = {"from_attributes": True}


class InsuranceUpsert(BaseModel):
    provider_name: str
    policy_number: str
    insurance_type: str
    start_date: date
    end_date: date
    total_insurance_amount: float = Field(..., ge=0)
    renewal_status: str = "pending"


class InsuranceResponse(BaseModel):
    id: int
    vehicle_number: str
    provider_name: str
    policy_number: str
    insurance_type: str
    start_date: date
    end_date: date
    total_insurance_amount: float
    monthly_insurance_cost: float
    renewal_status: str
    remaining_days: int
    status: str

    model_config = {"from_attributes": True}


class TaxUpsert(BaseModel):
    road_tax: float = Field(default=0, ge=0)
    permit_tax: float = Field(default=0, ge=0)
    fitness_tax: float = Field(default=0, ge=0)
    pollution_tax: float = Field(default=0, ge=0)
    permit_charges: float = Field(default=0, ge=0)
    other_taxes: float = Field(default=0, ge=0)
    tax_start_date: date
    tax_expiry_date: date
    renewal_status: str = "pending"

    @computed_field  # type: ignore[misc]
    @property
    def annual_total_tax(self) -> float:
        return _round_2(
            self.road_tax
            + self.permit_tax
            + self.fitness_tax
            + self.pollution_tax
            + self.permit_charges
            + self.other_taxes
        )


class TaxResponse(BaseModel):
    id: int
    vehicle_number: str
    road_tax: float
    permit_tax: float
    fitness_tax: float
    pollution_tax: float
    permit_charges: float
    other_taxes: float
    tax_start_date: date
    tax_expiry_date: date
    annual_total_tax: float
    monthly_tax_cost: float
    renewal_status: str
    remaining_days: int
    status: str

    model_config = {"from_attributes": True}


class FinanceVehicleSummary(BaseModel):
    vehicle_number: str
    emi: EMIPlanResponse | None = None
    insurance: InsuranceResponse | None = None
    tax: TaxResponse | None = None
    monthly_finance_total: float
    alert_count: int
    alerts: list[str]


class FinanceDashboardSummary(BaseModel):
    emi_pending_installments: int
    emi_paid_installments: int
    emi_overdue_installments: int
    insurance_expiring_soon: int
    insurance_expired: int
    tax_expiring_soon: int
    tax_expired: int
    total_monthly_emi_outflow: float
    total_monthly_insurance_outflow: float
    total_monthly_tax_outflow: float
    total_monthly_finance_outflow: float
    alert_cards: list[dict]
    vehicle_wise_expenses: list[dict]
