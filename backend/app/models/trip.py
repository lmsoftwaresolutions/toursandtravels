from sqlalchemy import Column, Integer, String, ForeignKey, Date, Float, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)

    trip_date = Column(Date, nullable=False)
    departure_datetime = Column(DateTime(timezone=True))
    return_datetime = Column(DateTime(timezone=True))
    from_location = Column(String, nullable=False)
    to_location = Column(String, nullable=False)
    route_details = Column(Text)

    vehicle_number = Column(String, ForeignKey("vehicles.vehicle_number"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    customer_id = Column(Integer, ForeignKey("customers.id"))

    start_km = Column(Float, default=0)
    end_km = Column(Float, default=0)
    distance_km = Column(Integer, nullable=True)  # Optional for package pricing

    # 🔥 PHASE-2 FIELDS
    diesel_used = Column(Float, default=0)
    petrol_used = Column(Float, default=0)
    fuel_litres = Column(Float, default=0)
    toll_amount = Column(Float, default=0)
    parking_amount = Column(Float, default=0)
    other_expenses = Column(Float, default=0)
    driver_bhatta = Column(Float, default=0)
    vendor = Column(String)

    # 🔥 CUSTOMER CHARGE FIELDS
    pricing_type = Column(String, default="per_km")  # per_km or package
    package_amount = Column(Float, default=0)
    cost_per_km = Column(Float, default=0)
    charged_toll_amount = Column(Float, default=0)
    charged_parking_amount = Column(Float, default=0)
    discount_amount = Column(Float, default=0)
    amount_received = Column(Float, default=0)
    advance_payment = Column(Float, default=0)
    total_charged = Column(Float, default=0)
    pending_amount = Column(Float, default=0)

    total_cost = Column(Float, default=0)
    
    # INVOICE FIELD
    invoice_number = Column(String(50), unique=True, nullable=False)


    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pricing_items = relationship(
        "TripPricingItem",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    driver_changes = relationship(
        "TripDriverChange",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def calculate_pending_amount(self):
        """Calculate and update pending amount"""
        self.pending_amount = max(0, (self.total_charged or 0) - (self.amount_received or 0))
