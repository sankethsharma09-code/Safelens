from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import get_settings
from app.routers import scan_router, devices_router, auth_router
from app.services.auth_db import init_auth_db

settings = get_settings()

app = FastAPI(
    title="SafeLens Scam Protection API",
    description="On-device QR code and Text scam/phishing analysis backend",
    version="0.1.0",
)

# Initialize Auth database tables
init_auth_db()

# Enable CORS for desktop clients & Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Check if failure is due to unsupported kind
    for err in exc.errors():
        msg = err.get("msg", "")
        if "Unsupported item kind" in msg:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Unsupported item kind. Only 'qr' and 'text' are supported."},
            )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.errors()},
    )


# Include Routers
app.include_router(scan_router)
app.include_router(devices_router)
app.include_router(auth_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health & liveness check."""
    return {
        "status": "ok",
        "service": "safelens-backend",
        "environment": settings.ENVIRONMENT,
        "features": ["qr_scanner", "text_analyzer"],
    }
