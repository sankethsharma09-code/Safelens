import uuid
import secrets
from fastapi import APIRouter
from app.schemas.device import DeviceRegisterRequest, DeviceRegisterResponse

router = APIRouter(prefix="/api/v1/devices", tags=["Devices"])


@router.post("/register", response_model=DeviceRegisterResponse)
async def register_device(request: DeviceRegisterRequest):
    """Registers an anonymous SafeLens desktop device."""
    device_id = str(uuid.uuid4())
    token = secrets.token_urlsafe(32)
    return DeviceRegisterResponse(device_id=device_id, token=token)
