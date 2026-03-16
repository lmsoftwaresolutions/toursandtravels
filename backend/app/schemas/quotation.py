from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class QuotationBase(BaseModel):
    quotation_no: str
    customer_name: str
    address: Optional[str] = None
    mobile: Optional[str] = None
    quotation_date: date
    tour_description: Optional[str] = None
    approx_km: Optional[float] = 0
    rate_per_km: Optional[float] = 0
    no_of_buses: Optional[int] = 1
    trip_cost: Optional[float] = 0
    mp_tax: Optional[float] = 0
    border_entry: Optional[float] = 0
    toll: Optional[float] = 0
    total_amount: Optional[float] = 0
    amount_in_words: Optional[str] = None

class QuotationCreate(QuotationBase):
    pass

class QuotationUpdate(QuotationBase):
    pass

class QuotationResponse(QuotationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
