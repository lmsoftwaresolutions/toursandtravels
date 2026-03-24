from sqlalchemy import Column, Integer, String, Date, Float, Text
from app.database.base import Base
from .base_audit import AuditMixin

class Quotation(Base, AuditMixin):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quotation_no = Column(String, unique=True, index=True, nullable=False)
    customer_name = Column(String, nullable=False)
    address = Column(Text)
    mobile = Column(String)
    quotation_date = Column(Date, nullable=False)
    vehicle_type = Column(String)
    tour_description = Column(Text)
    notes = Column(Text)
    approx_km = Column(Float)
    rate_per_km = Column(Float)
    no_of_buses = Column(Integer, default=1)
    trip_cost = Column(Float)
    mp_tax = Column(Float, default=0)
    border_entry = Column(Float, default=0)
    toll = Column(Float, default=0)
    total_amount = Column(Float)
    amount_in_words = Column(Text)
