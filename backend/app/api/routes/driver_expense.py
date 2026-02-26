from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import SessionLocal
from app.schemas.driver_expense import DriverExpenseCreate, DriverExpenseUpdate, DriverExpenseResponse
from app.services.driver_expense_service import DriverExpenseService


router = APIRouter(
    prefix="/driver-expenses",
    tags=["Driver Expenses"]
)



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=DriverExpenseResponse)
def create_expense(expense: DriverExpenseCreate, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    return service.create_expense(expense)

@router.get("/trip/{trip_id}", response_model=List[DriverExpenseResponse])
def get_expenses_by_trip(trip_id: int, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    return service.get_expenses_by_trip(trip_id)

@router.get("/driver/{driver_id}", response_model=List[DriverExpenseResponse])
def get_expenses_by_driver(driver_id: int, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    return service.get_expenses_by_driver(driver_id)

@router.get("/{expense_id}", response_model=DriverExpenseResponse)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    expense = service.get_expense(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=DriverExpenseResponse)
def update_expense(expense_id: int, expense_update: DriverExpenseUpdate, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    expense = service.update_expense(expense_id, expense_update)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    service = DriverExpenseService(db)
    if not service.delete_expense(expense_id):
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}
