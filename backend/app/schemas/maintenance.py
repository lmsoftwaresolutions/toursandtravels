from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional


# ===============================
# ENUMS
# ===============================
class MaintenanceType(str, Enum):
    EMI = "emi"
    INSURANCE = "insurance"
    TAX = "tax"


# ===============================
# CREATE SCHEMA
# ===============================
class MaintenanceCreate(BaseModel):
    vehicle_number: str
    maintenance_type: MaintenanceType
    description: str
    amount: float
    start_date: datetime
    end_date: Optional[datetime] = None


# ===============================
# UPDATE SCHEMA
# ===============================
class MaintenanceUpdate(BaseModel):
    maintenance_type: Optional[MaintenanceType] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ===============================
# RESPONSE SCHEMA
# ===============================
class MaintenanceResponse(MaintenanceCreate):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None  # ✅ FIXED (allows NULL)

    # Pydantic v2 config
    model_config = {
        "from_attributes": True
    }
