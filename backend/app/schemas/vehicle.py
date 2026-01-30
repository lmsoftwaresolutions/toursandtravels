from pydantic import BaseModel

class VehicleBase(BaseModel):
    vehicle_number: str

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    total_km: int
    total_trips: int

    class Config:
        from_attributes = True
