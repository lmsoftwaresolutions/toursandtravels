from pydantic import BaseModel

class DriverCreate(BaseModel):
    name: str
    phone: str | None = None
    license_number: str | None = None


class DriverResponse(BaseModel):
    id: int
    name: str
    phone: str | None
    license_number: str | None

    class Config:
        orm_mode = True
