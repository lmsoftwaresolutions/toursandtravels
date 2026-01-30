from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.base import Base

class Fuel(Base):
    __tablename__ = "fuel_entries"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_number = Column(String, ForeignKey("vehicles.vehicle_number"), nullable=False)
    fuel_type = Column(String, nullable=False)  # diesel / petrol
    quantity = Column(Float, nullable=False)    # litres
    rate_per_litre = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)

    vendor = Column(String)

    filled_date = Column(Date, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
