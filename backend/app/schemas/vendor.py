from pydantic import BaseModel
from typing import Optional
from enum import Enum


class VendorCategory(str, Enum):
    FUEL = "fuel"
    SPARE_PARTS = "spare_parts"
    MECHANIC = "mechanic"
    OIL = "oil"


class VendorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    category: Optional[VendorCategory] = None


class VendorResponse(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True
