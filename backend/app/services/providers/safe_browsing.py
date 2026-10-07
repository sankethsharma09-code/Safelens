import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

SAFE_BROWSING_ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"


async def check_google_safe_browsing(url: str, api_key: Optional[str]) -> Optional[dict]:
    """
    Queries Google Safe Browsing API v4 for threats.
    Returns matched threat details dict or None if safe / API key not set / network error.
    """
    if not api_key:
        return None

    payload = {
        "client": {
            "clientId": "safelens-desktop",
            "clientVersion": "0.1.0",
        },
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(
                SAFE_BROWSING_ENDPOINT,
                params={"key": api_key},
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                matches = data.get("matches", [])
                if matches:
                    threat_type = matches[0].get("threatType", "SOCIAL_ENGINEERING")
                    return {
                        "flagged": True,
                        "threat_type": threat_type,
                        "source": "Google Safe Browsing",
                    }
                return {"flagged": False, "source": "Google Safe Browsing"}
            else:
                logger.warning(f"Safe Browsing API returned HTTP {resp.status_code}")
                return None
    except Exception as e:
        logger.warning(f"Safe Browsing check failed gracefully: {e}")
        return None
