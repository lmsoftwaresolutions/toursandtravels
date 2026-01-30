import os
from datetime import datetime, timedelta

from fastapi import HTTPException
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from sqlalchemy.orm import Session

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
