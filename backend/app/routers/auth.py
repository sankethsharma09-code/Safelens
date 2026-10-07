from fastapi import APIRouter, HTTPException, Header, status
from typing import Optional
import httpx
from app.config import get_settings
from app.schemas.auth import (
    SignUpRequest,
    SignInRequest,
    AuthResponse,
    UserProfile,
    GoogleAuthRequest,
)
from app.services.auth_db import (
    create_user,
    authenticate_user,
    get_or_create_google_user,
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


@router.post("/google", response_model=AuthResponse)
async def google_auth(payload: GoogleAuthRequest):
    """
    Authenticates or signs up a user via Google.
    Supports either:
    1. Real Google ID token (`credential`) verified with Google's public OAuth2 tokeninfo API.
    2. Direct Google email/name payload for development testing.
    """
    settings = get_settings()
    email: str | None = None
    full_name: str | None = None

    if payload.credential:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}"
                )
                if res.status_code == 200:
                    data = res.json()
                    email = data.get("email")
                    full_name = data.get("name") or data.get("given_name") or ""

                    # Verify audience if GOOGLE_CLIENT_ID is configured in .env
                    if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Google token audience does not match configured GOOGLE_CLIENT_ID.",
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired Google credential token.",
                    )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to reach Google OAuth services: {exc}",
            )
    elif payload.email:
        clean = payload.email.strip().lower()
        if "@" not in clean or "." not in clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google email address.",
            )
        email = clean
        full_name = payload.full_name or ""
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either a Google credential token or email must be provided.",
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to extract verified email from Google authentication.",
        )

    result = get_or_create_google_user(email=email, full_name=full_name)
    return result



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
