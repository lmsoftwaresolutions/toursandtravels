from sqlalchemy.orm import Session
from app.models.driver_expense import DriverExpense
from app.schemas.driver_expense import DriverExpenseCreate, DriverExpenseUpdate
from typing import List, Optional

class DriverExpenseService:
    def __init__(self, db: Session):
        self.db = db

    def create_expense(self, expense: DriverExpenseCreate) -> DriverExpense:
        db_expense = DriverExpense(**expense.dict())
        self.db.add(db_expense)
        self.db.commit()
        self.db.refresh(db_expense)
        return db_expense

    def get_expenses_by_trip(self, trip_id: int) -> List[DriverExpense]:
        return self.db.query(DriverExpense).filter(DriverExpense.trip_id == trip_id).all()

    def get_expenses_by_driver(self, driver_id: int) -> List[DriverExpense]:
        return self.db.query(DriverExpense).filter(DriverExpense.driver_id == driver_id).all()

    def get_expense(self, expense_id: int) -> Optional[DriverExpense]:
        return self.db.query(DriverExpense).filter(DriverExpense.id == expense_id).first()

    def update_expense(self, expense_id: int, expense_update: DriverExpenseUpdate) -> Optional[DriverExpense]:
        db_expense = self.get_expense(expense_id)
        if db_expense:
            update_data = expense_update.dict(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_expense, key, value)
            self.db.commit()
            self.db.refresh(db_expense)
        return db_expense

    def delete_expense(self, expense_id: int) -> bool:
        db_expense = self.get_expense(expense_id)
        if db_expense:
            self.db.delete(db_expense)
            self.db.commit()
            return True
        return False
