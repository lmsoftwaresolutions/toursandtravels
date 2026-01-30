from sqlalchemy import Column, Integer, Float, ForeignKey, Date, Text, DateTime
from sqlalchemy.sql import func
from app.database.base import Base


class DriverSalary(Base):
    __tablename__ = "driver_salaries"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    paid_on = Column(Date, nullable=False)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
