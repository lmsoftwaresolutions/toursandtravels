from pydantic import BaseModel
from typing import List
from app.schemas.trip import TripResponse

class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None


class CustomerUpdate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None

class CustomerResponse(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    total_trips: int
    total_billed: float
    pending_balance: float

    class Config:
        orm_mode = True


class CustomerWithTrips(BaseModel):
    customer: CustomerResponse
    trips: List[TripResponse]

    class Config:
        orm_mode = True
