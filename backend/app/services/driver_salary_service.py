from sqlalchemy.orm import Session
from app.models.driver_salary import DriverSalary
from app.schemas.driver_salary import DriverSalaryCreate


def list_salaries_by_driver(db: Session, driver_id: int):
    return (
        db.query(DriverSalary)
        .filter(DriverSalary.driver_id == driver_id)
        .order_by(DriverSalary.paid_on.desc())
        .all()
    )


def create_salary(db: Session, data: DriverSalaryCreate):
    salary = DriverSalary(**data.dict())
    db.add(salary)
    db.commit()
    db.refresh(salary)
    return salary


def delete_salary(db: Session, salary_id: int):
    salary = db.query(DriverSalary).filter(DriverSalary.id == salary_id).first()
    if salary:
        db.delete(salary)
        db.commit()
    return salary
