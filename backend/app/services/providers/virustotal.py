import base64
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

VIRUSTOTAL_URL_ENDPOINT = "https://www.virustotal.com/api/v3/urls"


async def check_virustotal(url: str, api_key: Optional[str]) -> Optional[dict]:
    """
    Queries VirusTotal API v3 for URL reputation.
    Returns stats dict or None if API key not set / network error.
    """
    if not api_key:
        return None

    try:
        url_id = base64.urlsafe_b64encode(url.strip().encode("utf-8")).decode("utf-8").strip("=")
        headers = {"x-apikey": api_key, "Accept": "application/json"}

        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{VIRUSTOTAL_URL_ENDPOINT}/{url_id}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                harmless = stats.get("harmless", 0)
                return {
                    "malicious_count": malicious,
                    "suspicious_count": suspicious,
                    "harmless_count": harmless,
                    "flagged": (malicious > 0 or suspicious > 2),
                    "source": "VirusTotal",
                }
            return None
    except Exception as e:
        logger.warning(f"VirusTotal check failed gracefully: {e}")
        return None
