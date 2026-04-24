from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from app.database.base import Base


class VehicleTax(Base):
    __tablename__ = "vehicle_tax"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, index=True)
    road_tax = Column(Float, nullable=False, default=0)
    permit_tax = Column(Float, nullable=False, default=0)
    fitness_tax = Column(Float, nullable=False, default=0)
    pollution_tax = Column(Float, nullable=False, default=0)
    permit_charges = Column(Float, nullable=False, default=0)
    other_taxes = Column(Float, nullable=False, default=0)
    tax_start_date = Column(Date, nullable=False)
    tax_expiry_date = Column(Date, nullable=False, index=True)
    annual_total_tax = Column(Float, nullable=False, default=0)
    monthly_tax_cost = Column(Float, nullable=False, default=0)
    renewal_status = Column(String, nullable=False, default="pending")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
