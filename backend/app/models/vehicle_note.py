from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from datetime import datetime
from app.database.base import Base


class VehicleNote(Base):
    __tablename__ = "vehicle_notes"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, nullable=False)
    note = Column(String, nullable=False)

    note_date = Column(Date, nullable=False)      # for filtering
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
