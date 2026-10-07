import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

URLHAUS_API_ENDPOINT = "https://urlhaus-api.abuse.ch/v1/url/"


async def check_urlhaus(url: str) -> Optional[dict]:
    """
    Queries URLhaus (abuse.ch) public database for malware and phishing distribution URLs.
    No API key required.
    Returns matched details dict or None if not found / network error.
    """
    clean_url = url.strip()
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(
                URLHAUS_API_ENDPOINT,
                data={"url": clean_url},
                headers={"Accept": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("query_status")
                if status == "ok":
                    return {
                        "flagged": True,
                        "threat": data.get("threat", "Malicious URL"),
                        "url_status": data.get("url_status", "active"),
                        "tags": data.get("tags") or [],
                        "source": "URLhaus",
                    }
                elif status == "no_results":
                    return {"flagged": False, "source": "URLhaus"}
            return None
    except Exception as e:
        logger.debug(f"URLhaus check skipped/failed gracefully: {e}")
        return None
