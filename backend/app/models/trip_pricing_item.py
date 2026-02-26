from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database.base import Base


class TripPricingItem(Base):
    __tablename__ = "trip_pricing_items"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)

    description = Column(String, nullable=False)
    quantity = Column(Float, default=1)
    rate = Column(Float, default=0)
    amount = Column(Float, default=0)
    item_type = Column(String, default="pricing")  # pricing | charge

    created_at = Column(DateTime(timezone=True), server_default=func.now())
