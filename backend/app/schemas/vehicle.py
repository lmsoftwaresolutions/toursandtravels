from pydantic import BaseModel

class VehicleBase(BaseModel):
    vehicle_number: str
    vehicle_type: str | None = None
    seat_count: int | None = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    vehicle_number: str
    vehicle_type: str | None = None
    seat_count: int | None = None

class VehicleResponse(VehicleBase):
    id: int
    total_km: int
    total_trips: int

    class Config:
        from_attributes = True
