from pydantic import BaseModel, Field


class DeviceRegisterRequest(BaseModel):
    platform: str = Field(default="windows", description="Client OS platform (windows, macos, linux)")
    app_version: str = Field(default="0.1.0", description="Installed SafeLens client version")


class DeviceRegisterResponse(BaseModel):
    device_id: str
    token: str
