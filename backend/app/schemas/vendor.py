from pydantic import BaseModel
from typing import Optional


class VendorCreate(BaseModel):
    name: str
    category: Optional[str] = None


class VendorResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None

    class Config:
        from_attributes = True
