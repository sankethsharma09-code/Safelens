import re
from urllib.parse import urlparse
from typing import Optional
from app.schemas.scan import ExtractedItemResult, Flag
from app.services.providers import check_google_safe_browsing, check_virustotal

# URL Regex extractor
URL_REGEX = re.compile(
    r'(?:https?://|www\.)[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:/[^\s]*)?',
    re.IGNORECASE,
)

# Common targeted brand names often abused in phishing lures
TARGETED_BRANDS = [
    "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "bob", "paypal",
    "google", "microsoft", "apple", "amazon", "netflix", "chase", "wellsfargo",
    "bank", "banking", "paytm", "phonepe", "gpay"
]

# High-risk TLDs often favored by throwaway phishing infrastructure
HIGH_RISK_TLDS = {".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".work", ".vip", ".click", ".buzz", ".support", ".fit"}

# Keywords frequently combined with brands in deceptive subdomains/domains
SUSPICIOUS_KEYWORDS = [
    "kyc", "update", "verify", "secure", "login", "signin", "support",
    "account", "auth", "portal", "confirm", "recovery", "alert", "reward"
]


def extract_urls(text: str) -> list[str]:
    """Finds all URLs within plain text or QR payload."""
    matches = URL_REGEX.findall(text)
    clean_urls = []
    for m in matches:
        u = m.strip()
        if not u.startswith("http://") and not u.startswith("https://"):
            u = "https://" + u
        if u not in clean_urls:
            clean_urls.append(u)
    return clean_urls


async def analyze_url(
    url: str,
    item_id: str,
    safe_browsing_key: Optional[str] = None,
    virustotal_key: Optional[str] = None,
) -> ExtractedItemResult:
    """Analyzes a single URL for lookalikes, suspicious TLDs, and threat intelligence matches."""
    flags: list[Flag] = []
    score = 5  # Baseline score for unknown clean URL

    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()

    # 1. Check IP address host
    ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    if ip_pattern.match(hostname):
        flags.append(Flag(
            label="Direct IP Host",
            detail=f"URL points directly to raw IP address ({hostname}) rather than a registered domain."
        ))
        score += 45

    # 2. Check Punycode (IDN homograph attack)
    if "xn--" in hostname:
        flags.append(Flag(
            label="IDN Homograph Trick",
            detail="Punycode encoding detected, often used to disguise lookalike Cyrillic/Greek characters."
        ))
        score += 50

    # 3. Check Brand Impersonation & Lookalikes
    matched_brand = None
    for brand in TARGETED_BRANDS:
        if brand in hostname:
            matched_brand = brand
            break

    has_suspicious_kw = any(kw in hostname or kw in parsed.path.lower() for kw in SUSPICIOUS_KEYWORDS)

    if matched_brand:
        # Legitimate official domain checks for known brands
        legit_domains = {
            "sbi": ["sbi.co.in", "onlinesbi.sbi", "bank.sbi"],
            "hdfc": ["hdfcbank.com", "hdfc.com"],
            "icici": ["icicibank.com"],
            "paypal": ["paypal.com"],
            "google": ["google.com"],
            "microsoft": ["microsoft.com", "live.com"],
            "apple": ["apple.com", "icloud.com"],
            "amazon": ["amazon.com", "amazon.in"],
        }
        is_legit = False
        if matched_brand in legit_domains:
            for legit in legit_domains[matched_brand]:
                if hostname == legit or hostname.endswith("." + legit):
                    is_legit = True
                    break

        if not is_legit and has_suspicious_kw:
            flags.append(Flag(
                label="Lookalike Domain Spoofing",
                detail=f"Domain targets '{matched_brand.upper()}' brand combined with verification lures."
            ))
            score += 65
        elif not is_legit and any(hostname.endswith(tld) for tld in HIGH_RISK_TLDS):
            flags.append(Flag(
                label="Brand Lure on Suspicious TLD",
                detail=f"Domain references '{matched_brand.upper()}' on a high-risk throwaway TLD."
            ))
            score += 55

    # 4. Check high-risk TLD alone
    for tld in HIGH_RISK_TLDS:
        if hostname.endswith(tld) and not flags:
            flags.append(Flag(
                label="High-Risk TLD",
                detail=f"Top-level domain '{tld}' has disproportionate correlation with transient phishing."
            ))
            score += 25
            break

    # 5. External Threat Feeds
    if safe_browsing_key:
        sb_result = await check_google_safe_browsing(url, safe_browsing_key)
        if sb_result and sb_result.get("flagged"):
            flags.append(Flag(
                label="Google Safe Browsing Match",
                detail=f"Identified as malicious ({sb_result.get('threat_type')}) in Google threat intelligence."
            ))
            score = max(score, 90)

    if virustotal_key:
        vt_result = await check_virustotal(url, virustotal_key)
        if vt_result and vt_result.get("flagged"):
            flags.append(Flag(
                label="VirusTotal Detection",
                detail=f"{vt_result.get('malicious_count')} security engines flagged this URL as malicious."
            ))
            score = max(score, 88)

    # Cap score
    score = min(max(score, 0), 100)

    # Determine verdict
    if score >= 60:
        verdict = "Dangerous"
        explanation = "High-risk URL exhibiting strong phishing indicators or malicious threat feed matches."
    elif score >= 25:
        verdict = "Suspicious"
        explanation = "Suspicious destination with unverified domain reputation or deceptive naming patterns."
    else:
        verdict = "Safe"
        explanation = "No known deceptive patterns, typosquatting, or threat feed hits found."

    return ExtractedItemResult(
        id=item_id,
        kind="url",
        value=url,
        verdict=verdict,
        score=score,
        flags=flags,
        explanation=explanation,
    )
