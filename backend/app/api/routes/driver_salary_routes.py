from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.schemas.driver_salary import DriverSalaryCreate, DriverSalaryResponse
from app.services.driver_salary_service import (
    list_salaries_by_driver,
    create_salary,
    delete_salary,
)

router = APIRouter(prefix="/driver-salaries", tags=["Driver Salaries"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/driver/{driver_id}", response_model=list[DriverSalaryResponse])
def get_driver_salaries(driver_id: int, db: Session = Depends(get_db)):
    return list_salaries_by_driver(db, driver_id)


@router.post("", response_model=DriverSalaryResponse)
def add_salary(data: DriverSalaryCreate, db: Session = Depends(get_db)):
    return create_salary(db, data)


@router.delete("/{salary_id}")
def remove_salary(salary_id: int, db: Session = Depends(get_db)):
    deleted = delete_salary(db, salary_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Salary record not found")
    return {"message": "Salary record deleted"}
