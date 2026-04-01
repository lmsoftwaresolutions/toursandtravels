from datetime import date, datetime
from pydantic import BaseModel, field_validator
from app.schemas.date_validators import validate_reasonable_past_or_today_date


class MechanicCreate(BaseModel):
    vehicle_number: str
    work_description: str
    cost: float
    vendor: str | None = None
    service_date: date

    @field_validator("service_date")
    @classmethod
    def validate_service_date(cls, value: date) -> date:
        return validate_reasonable_past_or_today_date(value, "Service date")


class MechanicResponse(MechanicCreate):
    id: int
    created_at: datetime | None = None

    model_config = {
        "from_attributes": True
    }
