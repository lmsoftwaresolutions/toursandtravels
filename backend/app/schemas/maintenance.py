from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class MaintenanceType(str, Enum):
    EMI = "emi"
    INSURANCE = "insurance"
    TAX = "tax"

class MaintenanceCreate(BaseModel):
    vehicle_number: str
    maintenance_type: MaintenanceType
    description: str
    amount: float
    start_date: datetime

class MaintenanceUpdate(BaseModel):
    maintenance_type: MaintenanceType = None
    description: str = None
    amount: float = None
    start_date: datetime = None

class MaintenanceResponse(MaintenanceCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
