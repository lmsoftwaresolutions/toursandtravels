from sqlalchemy import Column, Integer, String, Date, DateTime
from sqlalchemy.sql import func
from app.database.base import Base


class DashboardNote(Base):
    __tablename__ = "dashboard_notes"

    id = Column(Integer, primary_key=True, index=True)
    note_date = Column(Date, nullable=False)
    note = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
