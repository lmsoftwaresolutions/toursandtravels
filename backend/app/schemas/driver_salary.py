from datetime import date, datetime
from pydantic import BaseModel
from typing import Optional


class DriverSalaryCreate(BaseModel):
    driver_id: int
    amount: float
    paid_on: date
    notes: Optional[str] = None


class DriverSalaryResponse(BaseModel):
    id: int
    driver_id: int
    amount: float
    paid_on: date
    notes: Optional[str] = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
