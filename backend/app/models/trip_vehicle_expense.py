from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class TripVehicleExpense(Base):
    __tablename__ = "trip_vehicle_expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_vehicle_id = Column(Integer, ForeignKey("trip_vehicles.id", ondelete="CASCADE"), nullable=False)
    
    expense_type = Column(String, nullable=False)  # e.g., Toll, Food, Parking
    amount = Column(Float, nullable=False, default=0)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip_vehicle = relationship("TripVehicle", back_populates="expenses")
