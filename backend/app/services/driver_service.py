from sqlalchemy.orm import Session
from app.models.driver import Driver


def create_driver(
    db: Session,
    name: str,
    phone: str = None,
    license_number: str = None,
    joining_date=None,
    monthly_salary: float | None = None
):
    driver = Driver(
        name=name,
        phone=phone,
        license_number=license_number,
        joining_date=joining_date,
        monthly_salary=monthly_salary
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


def get_drivers(db: Session):
    return db.query(Driver).all()


def get_driver(db: Session, driver_id: int):
    return db.query(Driver).filter(Driver.id == driver_id).first()
