from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.base import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    # ✅ Comes from Trip.invoice_number (single source of truth)
    invoice_number = Column(String(50), nullable=False)

    trip_id = Column(
        Integer,
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False
    )

    payment_date = Column(DateTime, nullable=False)
    payment_mode = Column(String(50), nullable=False)  # cash / online / etc.
    amount = Column(Float, nullable=False)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
