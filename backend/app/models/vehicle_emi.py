from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base import Base


class VehicleEMIPlan(Base):
    __tablename__ = "vehicle_emi_plans"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, index=True)
    vehicle_purchase_price = Column(Float, nullable=False, default=0)
    down_payment = Column(Float, nullable=False, default=0)
    loan_amount = Column(Float, nullable=False, default=0)
    annual_interest_rate = Column(Float, nullable=False, default=0)
    loan_duration_months = Column(Integer, nullable=False, default=1)
    emi_start_date = Column(Date, nullable=False)
    emi_end_date = Column(Date, nullable=False)
    monthly_emi = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    installments = relationship(
        "VehicleEMIInstallment",
        back_populates="plan",
        cascade="all, delete-orphan",
    )


class VehicleEMIInstallment(Base):
    __tablename__ = "vehicle_emi_installments"

    id = Column(Integer, primary_key=True, index=True)
    emi_plan_id = Column(Integer, ForeignKey("vehicle_emi_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_number = Column(Integer, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    opening_balance = Column(Float, nullable=False, default=0)
    principal_component = Column(Float, nullable=False, default=0)
    interest_component = Column(Float, nullable=False, default=0)
    amount_due = Column(Float, nullable=False, default=0)
    closing_balance = Column(Float, nullable=False, default=0)
    paid_amount = Column(Float, nullable=False, default=0)
    paid_on = Column(Date, nullable=True)
    is_paid = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    plan = relationship("VehicleEMIPlan", back_populates="installments")
