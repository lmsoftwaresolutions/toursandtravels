from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PaymentCreate(BaseModel):
    trip_id: int
    payment_date: datetime
    payment_mode: str
    amount: float
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    invoice_number: str        
    trip_id: int
    payment_date: datetime
    payment_mode: str
    amount: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
