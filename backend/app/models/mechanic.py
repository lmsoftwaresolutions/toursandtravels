from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.base import Base


class MechanicEntry(Base):
    __tablename__ = "mechanic_entries"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, ForeignKey("vehicles.vehicle_number"), nullable=False)
    work_description = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    vendor = Column(String)
    service_date = Column(Date, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
