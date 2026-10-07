import re
from app.schemas.scan import ExtractedItemResult, Flag

# Heuristic patterns for scam and phishing analysis
PATTERNS = [
    {
        "id": "artificial_urgency",
        "label": "Artificial Urgency",
        "regex": re.compile(
            r"\b(urgent|immediately|within\s+\d+\s+(?:hours?|hrs?|mins?|days?)|right\s+now|action\s+required|final\s+notice|last\s+chance|immediate\s+effect)\b",
            re.IGNORECASE,
        ),
        "detail": "Employs high-pressure urgency tactics to prevent careful verification.",
        "weight": 30,
    },
    {
        "id": "account_threat",
        "label": "Account Threat Coercion",
        "regex": re.compile(
            r"\b(account\s+(?:blocked|suspended|deactivated|frozen|terminated|closed)|card\s+blocked|sim\s+blocked|access\s+restricted)\b",
            re.IGNORECASE,
        ),
        "detail": "Threatens service disconnection or banking lockout to induce panic.",
        "weight": 35,
    },
    {
        "id": "kyc_credential_lure",
        "label": "Credential / KYC Harvest Lure",
        "regex": re.compile(
            r"\b(update\s+kyc|kyc\s+expired|link\s+pan|pan\s+card\s+update|verify\s+(?:identity|details|account)|enter\s+otp|share\s+otp|mpin|cvv|netbanking\s+password)\b",
            re.IGNORECASE,
        ),
        "detail": "Prompts recipient to disclose sensitive credentials or complete unverified KYC.",
        "weight": 40,
    },
    {
        "id": "authority_impersonation",
        "label": "Authority Impersonation",
        "regex": re.compile(
            r"\b(cyber\s*crime|police\s+department|cbi|income\s+tax\s+department|enforcement\s+directorate|court\s+summons|arrest\s+warrant|customs\s+clearance)\b",
            re.IGNORECASE,
        ),
        "detail": "Fabricates law enforcement or governmental authority to intimidate the victim.",
        "weight": 45,
    },
    {
        "id": "lottery_prize_lure",
        "label": "Prize / Lottery Bait",
        "regex": re.compile(
            r"\b(congratulations\s+you\s+(?:have\s+)?won|lottery\s+winner|claim\s+your\s+(?:prize|reward|cashback)|selected\s+for\s+prize|jackpot)\b",
            re.IGNORECASE,
        ),
        "detail": "Promises unrealistic financial windfalls to coax recipient compliance.",
        "weight": 35,
    },
]


def analyze_text(text: str, item_id: str) -> ExtractedItemResult:
    """Analyzes text for phishing, social engineering, and fraud indicators."""
    flags: list[Flag] = []
    accumulated_score = 0

    clean_text = text.strip()

    for p in PATTERNS:
        match = p["regex"].search(clean_text)
        if match:
            flags.append(Flag(
                label=p["label"],
                detail=f"{p['detail']} (Matched: '{match.group(0)}')"
            ))
            accumulated_score += p["weight"]

    # Calculate final item score capped between 0 and 100
    score = min(max(accumulated_score, 0), 100)

    # Threshold evaluation
    if score >= 60:
        verdict = "Dangerous"
        explanation = "Detected severe phishing signals including artificial urgency and credential harvesting demands."
    elif score >= 25:
        verdict = "Suspicious"
        explanation = "Contains cautionary phrasing commonly found in unsolicited promotional or deceptive messages."
    else:
        verdict = "Safe"
        explanation = "No overt phishing patterns, coercive threats, or credential harvesting lures detected."

    return ExtractedItemResult(
        id=item_id,
        kind="text",
        value=clean_text,
        verdict=verdict,
        score=score,
        flags=flags,
        explanation=explanation,
    )
