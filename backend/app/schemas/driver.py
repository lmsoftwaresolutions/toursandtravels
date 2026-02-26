from datetime import date
from pydantic import BaseModel

class DriverCreate(BaseModel):
    name: str
    phone: str | None = None
    license_number: str | None = None
    joining_date: date | None = None
    monthly_salary: float | None = None


class DriverResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    license_number: str | None
    joining_date: date | None
    monthly_salary: float | None

    class Config:
        orm_mode = True
