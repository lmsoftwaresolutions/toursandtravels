from sqlalchemy import Column, Integer, String
from app.database.base import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    phone = Column(String, nullable=True)
    category = Column(String, nullable=True)  # fuel, spare_parts, mechanic
