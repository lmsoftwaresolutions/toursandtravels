from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    CustomerWithTrips,
)
from app.services.customer_service import (
    create_customer,
    get_customers,
    get_customer,
    update_customer,
    get_customer_with_trips,
)

router = APIRouter(prefix="/customers", tags=["Customers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=CustomerResponse)
def add_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    return create_customer(db, data.name, data.phone, data.email)

@router.get("", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return get_customers(db)

@router.get("/{customer_id}", response_model=CustomerResponse)
def customer_details(customer_id: int, db: Session = Depends(get_db)):
    return get_customer(db, customer_id)


@router.put("/{customer_id}", response_model=CustomerResponse)
def edit_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = update_customer(db, customer_id, data.name, data.phone, data.email)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/{customer_id}/trips", response_model=CustomerWithTrips)
def customer_trips(customer_id: int, db: Session = Depends(get_db)):
    result = get_customer_with_trips(db, customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer, trips = result
    return {"customer": customer, "trips": trips}
