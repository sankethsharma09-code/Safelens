from pydantic import BaseModel, Field, field_validator


class SignUpRequest(BaseModel):
    email: str = Field(description="User email address")
    password: str = Field(min_length=6, description="Account password (at least 6 characters)")
    full_name: str | None = Field(default="", description="Full name or display alias")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean:
            raise ValueError("Please provide a valid email address.")
        return clean


class SignInRequest(BaseModel):
    email: str = Field(description="User email address")
    password: str = Field(description="Account password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        clean = v.strip().lower()
        if "@" not in clean or "." not in clean:
            raise ValueError("Please provide a valid email address.")
        return clean


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserProfile
