import os
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse

# ==========================
# Environment Configuration
# ==========================

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================
# JWT Helpers
# ==========================

def create_access_token(data: dict) -> str:
    """
    Create a JWT access token
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> str:
    """
    Verify JWT token and return username (subject)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return username

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==========================
# Auth Services
# ==========================

def login_user(db: Session, login_data: LoginRequest) -> LoginResponse:
    """
    Authenticate user and return JWT token
    """
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not user.verify_password(login_data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
        }
    )

    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            role=user.role,
        ),
    )


def create_user(
    db: Session,
    username: str,
    password: str,
    role: str = "user",
) -> User:
    """
    Create a new user
    """
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        username=username,
        password_hash=User.hash_password(password),
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def reset_password(
    db: Session,
    user: User,
    current_password: str,
    new_password: str,
) -> None:
    """
    Reset current user's password after validating current password.
    """
    if not user.verify_password(current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len((new_password or "").strip()) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if current_password == new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    user.password_hash = User.hash_password(new_password)
    db.add(user)
    db.commit()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    username = verify_token(token)
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_write_access(current_user: User = Depends(get_current_user)) -> User:
    role = (current_user.role or "").lower()
    if role == "limited":
        raise HTTPException(status_code=403, detail="Limited access: edit/delete not allowed")
    return current_user
