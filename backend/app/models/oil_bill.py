from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database.base import Base


class OilBill(Base):
    __tablename__ = "oil_bills"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    bill_number = Column(String, nullable=False, index=True)
    bill_date = Column(Date, nullable=False, index=True)
    payment_status = Column(String, nullable=False, default="unpaid")
    payment_mode = Column(String, nullable=True)
    overall_note = Column(Text, nullable=True)
    grand_total_amount = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    entries = relationship(
        "OilBillEntry",
        back_populates="bill",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class OilBillEntry(Base):
    __tablename__ = "oil_bill_entries"

    id = Column(Integer, primary_key=True, index=True)
    oil_bill_id = Column(Integer, ForeignKey("oil_bills.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_number = Column(String, ForeignKey("vehicles.vehicle_number"), nullable=False, index=True)
    particular_name = Column(String, nullable=False)
    liters = Column(Float, nullable=False, default=0)
    rate = Column(Float, nullable=False, default=0)
    total_amount = Column(Float, nullable=False, default=0)
    note = Column(Text, nullable=True)
    row_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bill = relationship("OilBill", back_populates="entries")
