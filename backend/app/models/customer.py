from sqlalchemy import Column, Integer, String, Float
from app.database.base import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    total_trips = Column(Integer, default=0)
    total_billed = Column(Float, default=0)
    pending_balance = Column(Float, default=0)
