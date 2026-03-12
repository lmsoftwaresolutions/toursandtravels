from datetime import date, datetime
from pydantic import BaseModel


class MechanicCreate(BaseModel):
    vehicle_number: str
    work_description: str
    cost: float
    vendor: str | None = None
    service_date: date


class MechanicResponse(MechanicCreate):
    id: int
    created_at: datetime | None = None

    model_config = {
        "from_attributes": True
    }
