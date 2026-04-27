from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.customer_routes import router as customer_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.dashboard_notes import router as dashboard_notes_router
from app.api.routes.driver_expense import router as driver_expense_router
from app.api.routes.driver_routes import router as driver_router
from app.api.routes.driver_salary_routes import router as driver_salary_router
from app.api.routes.fuel import router as fuel_router
from app.api.routes.mechanic import router as mechanic_router
from app.api.routes.maintenance import router as maintenance_router
from app.api.routes.oil_bill import router as oil_bill_router
from app.api.routes.payment import router as payment_router
from app.api.routes.spare_part import router as spare_part_router
from app.api.routes.quotation import router as quotation_router
from app.api.routes.trip import router as trip_router
from app.api.routes.vehicle import router as vehicle_router
from app.api.routes.vehicle_notes import router as vehicle_notes_router
from app.api.routes.vendor import router as vendor_router
from app.api.routes.vendor_payment_routes import router as vendor_payment_router
from app.database.session import engine
from app.models.user import User
from app.services.auth_service import get_current_user

app = FastAPI(
    title="Tour & Travel Management API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://localhost:80",
        "https://nathkrupa.lmsoftwaresolutions.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session


def create_default_users() -> None:
    db = Session(bind=engine)
    try:
        default_users = [
            ("Nathkrupa_1", "Nathkrupa_1", "admin"),
            ("Nathkrupa_2", "Nathkrupa_2", "admin"),
            ("Nathkrupa_3", "Nathkrupa_3", "limited"),
        ]

        for username, password, role in default_users:
            exists = db.query(User).filter(User.username == username).first()
            if exists:
                continue
            db.add(
                User(
                    username=username,
                    password_hash=User.hash_password(password),
                    role=role,
                )
            )
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
    except OperationalError:
        # If migrations are not applied yet, skip bootstrap user creation.
        db.rollback()
    finally:
        db.close()


def ensure_driver_schema() -> None:
    db = Session(bind=engine)
    try:
        db.execute(
            text(
                """
                ALTER TABLE drivers
                ADD COLUMN IF NOT EXISTS joining_date DATE;
                """
            )
        )
        db.execute(
            text(
                """
                ALTER TABLE drivers
                ADD COLUMN IF NOT EXISTS monthly_salary DOUBLE PRECISION;
                """
            )
        )
        db.execute(
            text(
                """
                ALTER TABLE drivers
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
                """
            )
        )
        db.execute(
            text(
                """
                UPDATE drivers
                SET is_active = TRUE
                WHERE is_active IS NULL;
                """
            )
        )
        db.commit()
    except OperationalError:
        db.rollback()
    finally:
        db.close()


create_default_users()
ensure_driver_schema()

auth_dependency = [Depends(get_current_user)]

app.include_router(auth_router, prefix="/api")

app.include_router(vehicle_router, prefix="/api", dependencies=auth_dependency)
app.include_router(vehicle_notes_router, prefix="/api", dependencies=auth_dependency)
app.include_router(trip_router, prefix="/api", dependencies=auth_dependency)
app.include_router(quotation_router, prefix="/api", dependencies=auth_dependency)
app.include_router(fuel_router, prefix="/api", dependencies=auth_dependency)
app.include_router(mechanic_router, prefix="/api", dependencies=auth_dependency)
app.include_router(maintenance_router, prefix="/api", dependencies=auth_dependency)
app.include_router(oil_bill_router, prefix="/api", dependencies=auth_dependency)
app.include_router(customer_router, prefix="/api", dependencies=auth_dependency)
app.include_router(driver_router, prefix="/api", dependencies=auth_dependency)
app.include_router(spare_part_router, prefix="/api", dependencies=auth_dependency)
app.include_router(payment_router, prefix="/api", dependencies=auth_dependency)
app.include_router(dashboard_router, prefix="/api", dependencies=auth_dependency)
app.include_router(dashboard_notes_router, prefix="/api", dependencies=auth_dependency)
app.include_router(vendor_router, prefix="/api", dependencies=auth_dependency)
app.include_router(vendor_payment_router, prefix="/api", dependencies=auth_dependency)
app.include_router(driver_expense_router, prefix="/api", dependencies=auth_dependency)
app.include_router(driver_salary_router, prefix="/api", dependencies=auth_dependency)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {
        "message": "Tour & Travel Management API is running",
        "status": "OK",
        "login": "POST /auth/login",
    }
