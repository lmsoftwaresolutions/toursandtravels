from sqlalchemy import Column, Integer, Float, ForeignKey, Date, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base


class VendorPayment(Base):
    __tablename__ = "vendor_payments"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    oil_bill_id = Column(Integer, ForeignKey("oil_bills.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Float, nullable=False)
    paid_on = Column(Date, nullable=False)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trip = relationship("Trip", lazy="joined")
    oil_bill = relationship("OilBill", back_populates="payments", lazy="joined")
