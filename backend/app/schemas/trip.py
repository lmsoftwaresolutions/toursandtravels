from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

# ======================
# PRICING ITEMS
# ======================
class TripPricingItemBase(BaseModel):
    description: str
    quantity: float = 1
    rate: float = 0
    amount: float = 0
    item_type: str = "pricing"  # pricing | charge

class TripPricingItemCreate(TripPricingItemBase):
    pass

class TripPricingItemResponse(TripPricingItemBase):
    id: int

    class Config:
        from_attributes = True

# ======================
# DRIVER CHANGES
# ======================
class TripDriverChangeBase(BaseModel):
    driver_id: int
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None

class TripDriverChangeCreate(TripDriverChangeBase):
    pass

class TripDriverChangeResponse(TripDriverChangeBase):
    id: int

    class Config:
        from_attributes = True


class TripVehicleBase(BaseModel):
    vehicle_number: str
    driver_id: int
    start_km: float | None = None
    end_km: float | None = None
    distance_km: int | None = None
    driver_bhatta: float = 0
    vehicle_type: Optional[str] = None
    seat_count: Optional[int] = None
    pricing_type: str = "per_km"
    package_amount: float = 0
    cost_per_km: float = 0


class TripVehicleCreate(TripVehicleBase):
    fuel_cost: float = 0
    fuel_litres: float = 0
    diesel_used: float = 0
    petrol_used: float = 0
    fuel_price: float = 0
    fuel_vendor: Optional[str] = None
    toll_amount: float = 0
    parking_amount: float = 0
    other_expenses: float = 0
    bus_type: Optional[str] = None
    vendor_deduction_description: Optional[str] = None
    vendor_deduction_amount: float = 0
    vendor_deduction_note: Optional[str] = None
    vendor_deduction_vendor: Optional[str] = None
    # Nested data within vehicle
    driver_changes: List[TripDriverChangeCreate] = []
    expenses: List["TripVehicleExpenseCreate"] = []

class TripVehicleExpenseBase(BaseModel):
    expense_type: str = ""
    amount: float = 0
    vendor: Optional[str] = None
    notes: Optional[str] = None

class TripVehicleExpenseCreate(TripVehicleExpenseBase):
    pass

class TripVehicleExpenseResponse(TripVehicleExpenseBase):
    id: int
    class Config:
        from_attributes = True

class TripVehicleResponse(TripVehicleBase):
    id: int
    fuel_cost: float
    fuel_litres: float
    diesel_used: float
    petrol_used: float
    fuel_price: float
    fuel_vendor: Optional[str]
    toll_amount: float
    parking_amount: float
    other_expenses: float
    bus_type: Optional[str]
    vendor_deduction_description: Optional[str] = None
    vendor_deduction_amount: float = 0
    vendor_deduction_note: Optional[str] = None
    vendor_deduction_vendor: Optional[str] = None
    
    expenses: List[TripVehicleExpenseResponse] = []

    class Config:
        from_attributes = True

# ======================
# CREATE TRIP
# ======================
class TripCreate(BaseModel):
    trip_date: date
    booking_id: Optional[str] = None
    departure_datetime: Optional[datetime] = None
    return_datetime: Optional[datetime] = None
    from_location: str
    to_location: str
    route_details: Optional[str] = None
    vehicle_number: str | None = None
    driver_id: int | None = None
    customer_id: int
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    start_km: float | None = None
    end_km: float | None = None
    distance_km: int | None = None  # Optional for package pricing

    number_of_vehicles: int = 1
    bus_type: str | None = None
    bus_detail: str | None = None

    pricing_type: str = "per_km"
    package_amount: float = 0

    # CUSTOMER CHARGES
    cost_per_km: float
    charged_toll_amount: float = 0
    charged_parking_amount: float = 0
    discount_amount: float = 0
    estimate_amount: float | None = None
    amount_received: float = 0
    advance_payment: float = 0

    # PHASE-2
    diesel_used: float = 0
    petrol_used: float = 0
    fuel_litres: float = 0
    toll_amount: float = 0
    parking_amount: float = 0
    other_expenses: float = 0
    driver_bhatta: float = 0
    vendor: str | None = None
    
    # INVOICE NUMBER
    invoice_number: str  # Required field

    # MULTI-ENTRY SUPPORT
    pricing_items: List[TripPricingItemCreate] = []
    charge_items: List[TripPricingItemCreate] = []
    # Note: driver_changes and vehicles handle nested logic
    driver_changes: List[TripDriverChangeCreate] = [] 
    vehicles: List[TripVehicleCreate] = []


# ======================
# UPDATE TRIP
# ======================
class TripUpdate(BaseModel):
    trip_date: date
    booking_id: Optional[str] = None
    departure_datetime: Optional[datetime] = None
    return_datetime: Optional[datetime] = None
    from_location: str
    to_location: str
    route_details: Optional[str] = None
    vehicle_number: str | None = None
    driver_id: int | None = None
    customer_id: int
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    start_km: float | None = None
    end_km: float | None = None
    distance_km: int | None = None  # Optional for package pricing

    number_of_vehicles: int = 1
    bus_type: str | None = None
    bus_detail: str | None = None

    pricing_type: str = "per_km"
    package_amount: float = 0

    cost_per_km: float
    charged_toll_amount: float = 0
    charged_parking_amount: float = 0
    discount_amount: float = 0
    estimate_amount: float | None = None
    amount_received: float = 0
    advance_payment: float = 0

    diesel_used: float = 0
    petrol_used: float = 0
    fuel_litres: float = 0
    toll_amount: float = 0
    parking_amount: float = 0
    other_expenses: float = 0
    driver_bhatta: float = 0
    vendor: str | None = None
    invoice_number: str  # Required field

    pricing_items: List[TripPricingItemCreate] = []
    charge_items: List[TripPricingItemCreate] = []
    driver_changes: List[TripDriverChangeCreate] = []
    vehicles: List[TripVehicleCreate] = []


# ======================
# RESPONSE
# ======================
class TripResponse(BaseModel):
    id: int
    trip_date: date
    booking_id: str | None
    departure_datetime: datetime | None
    return_datetime: datetime | None
    from_location: str
    to_location: str
    route_details: str | None
    vehicle_number: str | None
    driver_id: int | None
    customer_id: int
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    start_km: float | None
    end_km: float | None
    distance_km: int | None  # Optional for package pricing

    number_of_vehicles: int
    bus_type: str | None
    bus_detail: str | None

    pricing_type: str
    package_amount: float

    # PHASE-2
    diesel_used: float
    petrol_used: float
    fuel_litres: float
    toll_amount: float
    parking_amount: float
    other_expenses: float
    driver_bhatta: float
    vendor: str | None
    total_cost: float

    # CUSTOMER CHARGES
    cost_per_km: float
    charged_toll_amount: float
    charged_parking_amount: float
    discount_amount: float
    estimate_amount: float | None
    amount_received: float
    advance_payment: float
    total_charged: float
    pending_amount: float

    invoice_number: str | None
    created_at: datetime | None
    pricing_items: List[TripPricingItemResponse] = []
    driver_changes: List[TripDriverChangeResponse] = []
    vehicles: List[TripVehicleResponse] = []

    class Config:
        from_attributes = True
