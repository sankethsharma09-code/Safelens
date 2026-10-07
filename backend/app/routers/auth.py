from fastapi import APIRouter, HTTPException, Header, status
from typing import Optional
from app.schemas.auth import SignUpRequest, SignInRequest, AuthResponse, UserProfile
from app.services.auth_db import (
    create_user,
    authenticate_user,
    get_user_by_token,
    revoke_token,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


def extract_bearer_token(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token.",
        )
    return authorization.split("Bearer ", 1)[1].strip()


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignUpRequest):
    """Creates a new user account and returns session token."""
    try:
        result = create_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name or "",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/signin", response_model=AuthResponse)
async def signin(payload: SignInRequest):
    """Authenticates an existing user and returns a session token."""
    try:
        result = authenticate_user(email=payload.email, password=payload.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(authorization: Optional[str] = Header(None)):
    """Retrieves the profile of the currently logged-in user."""
    token = extract_bearer_token(authorization)
    user = get_user_by_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please sign in again.",
        )
    return user


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logs out user by revoking active session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ", 1)[1].strip()
        revoke_token(token)
    return {"message": "Successfully logged out."}
