from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class TripVehicle(Base):
    __tablename__ = "trip_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    vehicle_number = Column(String, ForeignKey("vehicles.vehicle_number"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    start_km = Column(Float, default=0)
    end_km = Column(Float, default=0)
    distance_km = Column(Integer, nullable=True)
    driver_bhatta = Column(Float, default=0)

    trip = relationship("Trip", back_populates="vehicles")
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
