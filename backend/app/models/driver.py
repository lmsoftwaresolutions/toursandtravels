from sqlalchemy import Column, Integer, String, Date, Float
from app.database.base import Base

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    license_number = Column(String, nullable=True)
    joining_date = Column(Date, nullable=True)
    monthly_salary = Column(Float, nullable=True)
