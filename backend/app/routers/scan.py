from fastapi import APIRouter, Depends, HTTPException, Request
from app.config import Settings, get_settings
from app.schemas.scan import ScanRequest, ScanResponse
from app.services.orchestrator import run_scan_pipeline

router = APIRouter(prefix="/api/v1", tags=["Scan"])


@router.post("/scan", response_model=ScanResponse)
async def scan_endpoint(
    request_data: ScanRequest,
    settings: Settings = Depends(get_settings),
):
    """
    Primary scan endpoint.
    Strictly accepts only 'qr' and 'text' items from the desktop snip session.
    """
    for item in request_data.items:
        if item.kind not in ("qr", "text"):
            raise HTTPException(
                status_code=400,
                detail="Unsupported item kind. Only 'qr' and 'text' are supported.",
            )

    return await run_scan_pipeline(
        items=request_data.items,
        settings=settings,
    )
