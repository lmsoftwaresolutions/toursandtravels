from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.session import engine
from app.database.base import Base

# Routers
from app.api.routes.vehicle import router as vehicle_router
from app.api.routes.vehicle_notes import router as vehicle_notes_router

from app.api.routes.trip import router as trip_router
from app.api.routes.fuel import router as fuel_router
from app.api.routes.maintenance import router as maintenance_router
from app.api.routes.customer_routes import router as customer_router
from app.api.routes.driver_routes import router as driver_router
from app.api.routes.spare_part import router as spare_part_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.vendor import router as vendor_router
from app.api.routes.vendor_payment_routes import router as vendor_payment_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.session import engine
from app.database.base import Base

# Routers
from app.api.routes.vehicle import router as vehicle_router
from app.api.routes.trip import router as trip_router
from app.api.routes.fuel import router as fuel_router
from app.api.routes.maintenance import router as maintenance_router
from app.api.routes.customer_routes import router as customer_router
from app.api.routes.driver_routes import router as driver_router
from app.api.routes.spare_part import router as spare_part_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.vendor import router as vendor_router
from app.api.routes.vendor_payment_routes import router as vendor_payment_router
# Ensure models imported for table creation
from app.models import vendor_payment  # noqa: F401
from app.api.routes.driver_expense import router as driver_expense_router
from app.api.routes.payment import router as payment_router
from app.api.routes.driver_salary_routes import router as driver_salary_router
# Ensure models are imported so metadata includes them
from app.models import driver_salary  # noqa: F401
from app.models import user  # noqa: F401
from app.api.routes.auth import router as auth_router


# Ensure models imported for table creation
from app.models import vendor_payment  # noqa: F401
from app.api.routes.driver_expense import router as driver_expense_router
from app.api.routes.payment import router as payment_router
from app.api.routes.driver_salary_routes import router as driver_salary_router
# Ensure models are imported so metadata includes them
from app.models import driver_salary  # noqa: F401
from app.models import user  # noqa: F401
from app.api.routes.auth import router as auth_router


app = FastAPI(
    title="Tour & Travel Management API",
    version="1.0.0"
)

API_PREFIX = "/api"

def include_router(router, prefix: str = "", tags=None):
    app.include_router(router, prefix=prefix, tags=tags)
    app.include_router(router, prefix=f"{API_PREFIX}{prefix}", tags=tags)

# ===============================
# CORS CONFIG (React Frontend)
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost",
        "http://localhost:80",
        "https://nathkrupa.lmsoftwaresolutions.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# Create DB Tables
# ===============================
Base.metadata.create_all(bind=engine)

# ===============================
# Create Default Users
# ===============================
from sqlalchemy.orm import Session
from app.models.user import User

def create_default_users():
    db = Session(bind=engine)
    try:
        # Check if users already exist
        admin1 = db.query(User).filter(User.username == "Nathkrupa_1").first()
        admin2 = db.query(User).filter(User.username == "Nathkrupa_2").first()
        limited = db.query(User).filter(User.username == "Nathkrupa_3").first()
        
        if not admin1:
            user1 = User(
                username="Nathkrupa_1",
                password_hash=User.hash_password("Nathkrupa_1"),
                role="admin"
            )
            db.add(user1)
        
        if not admin2:
            user2 = User(
                username="Nathkrupa_2",
                password_hash=User.hash_password("Nathkrupa_2"),
                role="admin"
            )
            db.add(user2)
        
        if not limited:
            user3 = User(
                username="Nathkrupa_3",
                password_hash=User.hash_password("Nathkrupa_3"),
                role="limited"
            )
            db.add(user3)
        
        db.commit()
    finally:
        db.close()

create_default_users()

# ===============================
# Register API Routers
# ===============================
include_router(vehicle_router, prefix="/vehicles", tags=["Vehicles"])
include_router(trip_router)
include_router(fuel_router)
include_router(maintenance_router, prefix="/maintenance", tags=["Maintenance"])
include_router(customer_router)
include_router(driver_router)
include_router(spare_part_router)
include_router(payment_router)
include_router(dashboard_router)
include_router(vendor_router)
include_router(vendor_payment_router)
include_router(driver_expense_router, prefix="/driver-expenses", tags=["Driver Expenses"])
include_router(driver_salary_router)
include_router(auth_router)
include_router(vehicle_notes_router)



# ===============================
# Root Health Check
# ===============================
@app.get("/")
def root():
    return {
        "message": "Tour & Travel Management API is running",
        "status": "OK",
        "login": "POST /auth/login with {username, password}"
    }
