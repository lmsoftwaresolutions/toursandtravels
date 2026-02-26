from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.schemas.driver import DriverCreate, DriverResponse
from app.services.driver_service import create_driver, get_drivers
from app.models.driver import Driver

router = APIRouter(
    prefix="/drivers",
    tags=["Drivers"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=DriverResponse)
def add_driver(data: DriverCreate, db: Session = Depends(get_db)):
    return create_driver(
        db,
        name=data.name,
        phone=data.phone,
        license_number=data.license_number,
        joining_date=data.joining_date,
        monthly_salary=data.monthly_salary
    )


@router.get("", response_model=list[DriverResponse])
def list_drivers(db: Session = Depends(get_db)):
    return get_drivers(db)


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver
