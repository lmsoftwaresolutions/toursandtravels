from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DriverExpenseBase(BaseModel):
    description: str
    amount: float
    notes: Optional[str] = None

class DriverExpenseCreate(DriverExpenseBase):
    trip_id: int
    driver_id: int

class DriverExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None

class DriverExpenseResponse(DriverExpenseBase):
    id: int
    trip_id: int
    driver_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
