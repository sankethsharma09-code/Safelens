from app.schemas.scan import ExtractedItemResult, OverallVerdict


def generate_explanation_and_action(
    overall: OverallVerdict,
    items: list[ExtractedItemResult],
    llm_api_key: str | None = None,
) -> tuple[str, str]:
    """
    Produces concise, plain-language explanation and actionable security advisory.
    Uses robust deterministic templates with full contextual intelligence.
    """
    flag_labels = [flag.label for it in items for flag in it.flags]
    has_qr = any(it.kind == "qr" for it in items)
    has_url = any(it.kind == "url" for it in items)
    has_text = any(it.kind == "text" for it in items)

    if overall.verdict == "Dangerous":
        reasons = []
        if "Artificial Urgency" in flag_labels:
            reasons.append("manufactures false urgency to force quick compliance")
        if "Credential / KYC Harvest Lure" in flag_labels:
            reasons.append("attempts to harvest credentials or sensitive KYC information")
        if "Lookalike Domain Spoofing" in flag_labels or "Brand Lure on Suspicious TLD" in flag_labels:
            reasons.append("links to a deceptive lookalike domain masquerading as a legitimate institution")
        if "Google Safe Browsing Match" in flag_labels or "VirusTotal Detection" in flag_labels:
            reasons.append("matches active malicious phishing entries in global threat intelligence feeds")
        if "Account Threat Coercion" in flag_labels:
            reasons.append("threatens severe account lockouts or legal action without verification")

        if reasons:
            explanation = (
                f"High scam likelihood: This snip {', and '.join(reasons[:2])}."
            )
        else:
            explanation = "High scam likelihood: Detected multiple high-risk indicators associated with financial fraud and credential theft."

        action = (
            "Do NOT visit the destination URL or scan this QR with a banking app. "
            "Never provide passwords, OTPs, or debit/credit card details. If in doubt, contact the official organization via their verified website."
        )

    elif overall.verdict == "Suspicious":
        if has_url or has_qr:
            explanation = (
                "Caution advised: The destination link or QR code uses an unverified or disposable domain structure commonly associated with deceptive redirects."
            )
        else:
            explanation = (
                "Caution advised: The message uses promotional pressure and unverified claims. Exercise diligence before taking action."
            )

        action = (
            "Verify the sender's identity through official channels before interacting. "
            "Do not enter personal credentials on unfamiliar web pages."
        )

    else:
        explanation = (
            "Verified Safe: No suspicious domain patterns, credential harvest lures, or threat intelligence hits were discovered in this snippet."
        )
        action = (
            "No immediate threat detected. Normal browsing and interaction hygiene recommended."
        )

    return explanation, action
