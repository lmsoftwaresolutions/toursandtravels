from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import LoginRequest, LoginResponse, PasswordResetRequest, PasswordResetResponse
from app.services.auth_service import get_current_user, get_db, login_user, reset_password
from app.models.user import User

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, login_data)


@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_user_password(
    payload: PasswordResetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reset_password(
        db=db,
        user=current_user,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return PasswordResetResponse(message="Password updated successfully")
