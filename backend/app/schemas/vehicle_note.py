from pydantic import BaseModel
from datetime import date, datetime

class VehicleNoteCreate(BaseModel):
    vehicle_id: int
    note: str
    note_date: date  # selected date

class VehicleNoteResponse(BaseModel):
    id: int
    vehicle_id: int
    note: str
    note_date: date
    created_at: datetime

    class Config:
        from_attributes = True
