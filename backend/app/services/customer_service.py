from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.trip import Trip

def create_customer(db: Session, name: str):
    customer = Customer(name=name)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

def get_customers(db: Session):
    return db.query(Customer).all()

def get_customer(db: Session, customer_id: int):
    return db.query(Customer).filter(Customer.id == customer_id).first()


def update_customer(db: Session, customer_id: int, name: str):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return None
    customer.name = name
    db.commit()
    db.refresh(customer)
    return customer


def get_customer_with_trips(db: Session, customer_id: int):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        return None
    trips = (
        db.query(Trip)
        .filter(Trip.customer_id == customer_id)
        .order_by(Trip.trip_date.desc())
        .all()
    )
    return customer, trips
