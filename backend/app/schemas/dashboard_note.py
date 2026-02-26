from pydantic import BaseModel
from datetime import date, datetime


class DashboardNoteCreate(BaseModel):
    note: str
    note_date: date


class DashboardNoteUpdate(BaseModel):
    note: str
    note_date: date


class DashboardNoteResponse(BaseModel):
    id: int
    note: str
    note_date: date
    created_at: datetime

    class Config:
        from_attributes = True
