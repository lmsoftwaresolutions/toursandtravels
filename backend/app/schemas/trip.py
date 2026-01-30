from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

# ======================
# CREATE TRIP
# ======================
class TripCreate(BaseModel):
    trip_date: date
    departure_datetime: Optional[datetime] = None
    return_datetime: Optional[datetime] = None
    from_location: str
    to_location: str
    route_details: Optional[str] = None
    vehicle_number: str
    driver_id: int
    customer_id: int
    distance_km: int | None = None  # Optional for package pricing

    pricing_type: str = "per_km"
    package_amount: float = 0

    # CUSTOMER CHARGES
    cost_per_km: float
    charged_toll_amount: float = 0
    charged_parking_amount: float = 0
    amount_received: float = 0
    advance_payment: float = 0

    # PHASE-2
    diesel_used: float = 0
    petrol_used: float = 0
    toll_amount: float = 0
    parking_amount: float = 0
    other_expenses: float = 0
    vendor: str | None = None
    
    # INVOICE NUMBER
    invoice_number: str  # Required field


# ======================
# UPDATE TRIP
# ======================
class TripUpdate(BaseModel):
    trip_date: date
    departure_datetime: Optional[datetime] = None
    return_datetime: Optional[datetime] = None
    from_location: str
    to_location: str
    route_details: Optional[str] = None
    vehicle_number: str
    driver_id: int
    customer_id: int
    distance_km: int | None = None  # Optional for package pricing

    pricing_type: str = "per_km"
    package_amount: float = 0

    cost_per_km: float
    charged_toll_amount: float = 0
    charged_parking_amount: float = 0
    amount_received: float = 0
    advance_payment: float = 0

    diesel_used: float = 0
    petrol_used: float = 0
    toll_amount: float = 0
    parking_amount: float = 0
    other_expenses: float = 0
    vendor: str | None = None
    invoice_number: str  # Required field


# ======================
# RESPONSE
# ======================
class TripResponse(BaseModel):
    id: int
    trip_date: date
    departure_datetime: datetime | None
    return_datetime: datetime | None
    from_location: str
    to_location: str
    route_details: str | None
    vehicle_number: str
    driver_id: int
    customer_id: int
    distance_km: int | None  # Optional for package pricing

    pricing_type: str
    package_amount: float

    # PHASE-2
    diesel_used: float
    petrol_used: float
    toll_amount: float
    parking_amount: float
    other_expenses: float
    vendor: str | None
    total_cost: float

    # CUSTOMER CHARGES
    cost_per_km: float
    charged_toll_amount: float
    charged_parking_amount: float
    amount_received: float
    advance_payment: float
    total_charged: float
    pending_amount: float

    invoice_number: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True
