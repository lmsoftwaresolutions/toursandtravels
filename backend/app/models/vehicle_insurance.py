from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String
from sqlalchemy.sql import func

from app.database.base import Base


class VehicleInsurance(Base):
    __tablename__ = "vehicle_insurance"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, index=True)
    provider_name = Column(String, nullable=False)
    policy_number = Column(String, nullable=False, index=True)
    insurance_type = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False, index=True)
    total_insurance_amount = Column(Float, nullable=False, default=0)
    monthly_insurance_cost = Column(Float, nullable=False, default=0)
    renewal_status = Column(String, nullable=False, default="pending")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
