from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.driver import Driver


def _normalize_driver_name(value: str | None) -> str:
    return " ".join(str(value or "").strip().split())


def _normalize_phone(value: str | None) -> str | None:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits or None


def _normalize_license(value: str | None) -> str | None:
    normalized = "".join(ch for ch in str(value or "").upper() if ch.isalnum())
    return normalized or None


def create_driver(
    db: Session,
    name: str,
    phone: str = None,
    license_number: str = None,
    joining_date=None,
    monthly_salary: float | None = None
):
    normalized_name = _normalize_driver_name(name)
    normalized_phone = _normalize_phone(phone)
    normalized_license = _normalize_license(license_number)

    if not normalized_name:
        raise HTTPException(status_code=400, detail="Driver name is required")

    exact_existing = (
        db.query(Driver)
        .filter(
            func.lower(Driver.name) == normalized_name.lower(),
            func.coalesce(Driver.phone, "") == (normalized_phone or ""),
            func.coalesce(Driver.license_number, "") == (normalized_license or ""),
        )
        .first()
    )
    if exact_existing:
        if not exact_existing.is_active:
            exact_existing.is_active = True
            exact_existing.joining_date = joining_date
            exact_existing.monthly_salary = monthly_salary
            exact_existing.phone = normalized_phone
            exact_existing.license_number = normalized_license
            db.commit()
            db.refresh(exact_existing)
        return exact_existing

    if normalized_license:
        existing_license = (
            db.query(Driver)
            .filter(func.coalesce(Driver.license_number, "") == normalized_license)
            .first()
        )
        if existing_license:
            raise HTTPException(status_code=400, detail="Driver with this license number already exists")

    if normalized_phone:
        existing_name_phone = (
            db.query(Driver)
            .filter(
                func.lower(Driver.name) == normalized_name.lower(),
                func.coalesce(Driver.phone, "") == normalized_phone,
            )
            .first()
        )
        if existing_name_phone:
            if not existing_name_phone.is_active:
                existing_name_phone.is_active = True
                existing_name_phone.joining_date = joining_date
                existing_name_phone.monthly_salary = monthly_salary
                existing_name_phone.phone = normalized_phone
                existing_name_phone.license_number = normalized_license
                db.commit()
                db.refresh(existing_name_phone)
            return existing_name_phone

    driver = Driver(
        name=normalized_name,
        phone=normalized_phone,
        license_number=normalized_license,
        joining_date=joining_date,
        monthly_salary=monthly_salary,
        is_active=True,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


def get_drivers(db: Session):
    return db.query(Driver).filter(Driver.is_active == True).all()


def get_driver(db: Session, driver_id: int):
    return db.query(Driver).filter(Driver.id == driver_id).first()
