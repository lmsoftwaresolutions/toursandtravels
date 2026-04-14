from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from app.services.driver_service import create_driver, get_drivers
from app.models.driver import Driver
from app.services.auth_service import require_admin

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
    driver = (
        db.query(Driver)
        .filter(Driver.id == driver_id, Driver.is_active == True)
        .first()
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver


@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    data: DriverUpdate,
    db: Session = Depends(get_db),
):
    driver = db.query(Driver).filter(Driver.id == driver_id, Driver.is_active == True).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(driver, field, value)

    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/{driver_id}")
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if not driver.is_active:
        return {"message": "Driver already deactivated"}

    driver.is_active = False
    db.commit()
    return {"message": "Driver deactivated successfully"}

