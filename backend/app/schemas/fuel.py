from datetime import date
from typing import Optional

from pydantic import BaseModel

class FuelCreate(BaseModel):
    vehicle_number: str
    fuel_type: str
    quantity: float
    rate_per_litre: float
    filled_date: date
    vendor: Optional[str] = None

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
