import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

PHISHTANK_CHECK_ENDPOINT = "https://checkurl.phishtank.com/checkurl/"


async def check_phishtank(url: str, app_key: Optional[str] = None) -> Optional[dict]:
    """
    Queries PhishTank API for known phishing URLs.
    Returns matched threat dict or None if clean / network error.
    """
    clean_url = url.strip()
    data = {
        "url": clean_url,
        "format": "json",
    }
    if app_key:
        data["app_key"] = app_key

    headers = {
        "User-Agent": "phishtank/safelens-desktop",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(
                PHISHTANK_CHECK_ENDPOINT,
                data=data,
                headers=headers,
            )
            if resp.status_code == 200:
                result = resp.json().get("results", {})
                if result.get("in_database") and result.get("valid"):
                    return {
                        "flagged": True,
                        "verified": result.get("verified", True),
                        "phish_detail_url": result.get("phish_detail_page"),
                        "source": "PhishTank",
                    }
                return {"flagged": False, "source": "PhishTank"}
            return None
    except Exception as e:
        logger.debug(f"PhishTank check skipped/failed gracefully: {e}")
        return None
