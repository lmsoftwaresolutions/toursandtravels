from pydantic import BaseModel, field_validator
from datetime import date
from typing import Optional
from app.schemas.date_validators import validate_reasonable_past_or_today_date


class SparePartCreate(BaseModel):
    vehicle_number: str
    bill_number: Optional[str] = None
    part_name: str
    cost: float
    quantity: int = 1
    vendor: Optional[str] = None
    replaced_date: date

    @field_validator("replaced_date")
    @classmethod
    def validate_replaced_date(cls, value: date) -> date:
        return validate_reasonable_past_or_today_date(value, "Replaced date")


class SparePartResponse(BaseModel):
    id: int
    bill_number: Optional[str] = None
    vehicle_number: str
    part_name: str
    cost: float
    quantity: int
    vendor: Optional[str]
    replaced_date: date

    class Config:
        from_attributes = True
