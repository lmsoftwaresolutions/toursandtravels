from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        orm_mode = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse


class PasswordResetRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetResponse(BaseModel):
    message: str
