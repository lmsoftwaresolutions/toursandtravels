from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.database.base import Base

class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_number = Column(
        String,
        ForeignKey("vehicles.vehicle_number"),
        nullable=False
    )

    part_name = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    vendor = Column(String)
    replaced_date = Column(Date, nullable=False)
