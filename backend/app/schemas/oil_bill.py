from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from app.schemas.date_validators import validate_reasonable_past_or_today_date


class OilBillEntryCreate(BaseModel):
    vehicle_number: str
    particular_name: str
    liters: float
    rate: float
    note: Optional[str] = None

    @field_validator("liters")
    @classmethod
    def validate_liters(cls, value: float) -> float:
        if (value or 0) <= 0:
            raise ValueError("Liters must be greater than zero")
        return float(value)

    @field_validator("rate")
    @classmethod
    def validate_rate(cls, value: float) -> float:
        if (value or 0) <= 0:
            raise ValueError("Rate must be greater than zero")
        return float(value)


class OilBillCreate(BaseModel):
    vendor_id: int
    bill_number: str
    bill_date: date
    payment_status: str
    payment_mode: Optional[str] = None
    overall_note: Optional[str] = None
    entries: list[OilBillEntryCreate]

    @field_validator("bill_date")
    @classmethod
    def validate_bill_date(cls, value: date) -> date:
        return validate_reasonable_past_or_today_date(value, "Bill date")


class OilBillEntryResponse(BaseModel):
    id: int
    vehicle_number: str
    particular_name: str
    liters: float
    rate: float
    total_amount: float
    note: Optional[str] = None
    row_order: int

    class Config:
        from_attributes = True


class OilBillResponse(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    bill_number: str
    bill_date: date
    payment_status: str
    payment_mode: Optional[str] = None
    overall_note: Optional[str] = None
    grand_total_amount: float
    total_vehicles: int
    entries: list[OilBillEntryResponse]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OilBillListResponse(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    bill_number: str
    bill_date: date
    payment_status: str
    grand_total_amount: float
    total_vehicles: int
    entries: list[OilBillEntryResponse] = []
