from sqlalchemy import Column, Integer, String, DateTime, Float, Enum
from sqlalchemy.sql import func
from app.database.base import Base
import enum
from datetime import datetime

class MaintenanceType(str, enum.Enum):
    EMI = "emi"
    INSURANCE = "insurance"
    TAX = "tax"

class Maintenance(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True)
    vehicle_number = Column(String, nullable=False)
    maintenance_type = Column(Enum(MaintenanceType), nullable=False)
    description = Column(String)
    amount = Column(Float, nullable=False)
    start_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
