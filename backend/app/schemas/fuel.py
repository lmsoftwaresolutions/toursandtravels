from datetime import date
from typing import Optional

from pydantic import BaseModel, field_validator
from app.schemas.date_validators import validate_reasonable_past_or_today_date

class FuelCreate(BaseModel):
    vehicle_number: str
    fuel_type: str
    quantity: float
    rate_per_litre: float
    filled_date: date
    vendor: Optional[str] = None

    @field_validator("filled_date")
    @classmethod
    def validate_filled_date(cls, value: date) -> date:
        return validate_reasonable_past_or_today_date(value, "Filled date")

class FuelResponse(BaseModel):
    id: int
    vehicle_number: str
    fuel_type: str
    quantity: float
    rate_per_litre: float
    total_cost: float
    filled_date: date
    vendor: Optional[str]

    class Config:
        from_attributes = True
