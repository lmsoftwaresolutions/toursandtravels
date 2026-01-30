from pydantic import BaseModel
from datetime import date
from typing import Optional


class SparePartCreate(BaseModel):
    vehicle_number: str
    part_name: str
    cost: float
    quantity: int = 1
    vendor: Optional[str] = None
    replaced_date: date


class SparePartResponse(BaseModel):
    id: int
    vehicle_number: str
    part_name: str
    cost: float
    quantity: int
    vendor: Optional[str]
    replaced_date: date

    class Config:
        from_attributes = True
