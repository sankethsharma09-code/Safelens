import time
import uuid
from app.config import Settings
from app.schemas.scan import (
    ScanItemInput,
    ScanResponse,
    ExtractedItemResult,
)
from app.services.text_analyzer import analyze_text
from app.services.url_analyzer import extract_urls, analyze_url
from app.services.scoring import calculate_overall_verdict
from app.services.explain import generate_explanation_and_action


async def run_scan_pipeline(
    items: list[ScanItemInput],
    settings: Settings,
) -> ScanResponse:
    """
    Executes the SafeLens scan analysis pipeline:
    1. Evaluates QR codes on-device payloads & destination URLs.
    2. Evaluates text OCR / snippets for social engineering and urgency.
    3. Analyzes embedded links against threat intelligence.
    4. Fuses scores into an overall verdict with plain-language explanation.
    """
    start_time = time.perf_counter()
    extracted_results: list[ExtractedItemResult] = []

    for idx, item in enumerate(items):
        item_id = f"item-{idx + 1}"
        val = item.value.strip()

        if item.kind == "qr":
            # Check if QR payload contains a URL
            found_urls = extract_urls(val)
            if found_urls:
                # Analyze the destination URL
                url_result = await analyze_url(
                    url=found_urls[0],
                    item_id=item_id,
                    safe_browsing_key=settings.SAFE_BROWSING_API_KEY,
                    virustotal_key=settings.VIRUSTOTAL_API_KEY,
                )
                # Keep kind as 'qr' for the parent QR item
                extracted_results.append(ExtractedItemResult(
                    id=item_id,
                    kind="qr",
                    value=val,
                    verdict=url_result.verdict,
                    score=url_result.score,
                    flags=url_result.flags,
                    explanation=f"QR payload links to {found_urls[0]}: {url_result.explanation}",
                ))
            else:
                # QR contains raw text or parameters
                text_result = analyze_text(val, item_id)
                extracted_results.append(ExtractedItemResult(
                    id=item_id,
                    kind="qr",
                    value=val,
                    verdict=text_result.verdict,
                    score=text_result.score,
                    flags=text_result.flags,
                    explanation=f"Decoded QR data: {text_result.explanation}",
                ))

        elif item.kind == "text":
            # 1. Analyze text heuristics
            text_result = analyze_text(val, item_id)
            extracted_results.append(text_result)

            # 2. Extract and check any embedded URLs inside the text
            embedded_urls = extract_urls(val)
            for u_idx, u in enumerate(embedded_urls):
                child_id = f"{item_id}-url-{u_idx + 1}"
                url_result = await analyze_url(
                    url=u,
                    item_id=child_id,
                    safe_browsing_key=settings.SAFE_BROWSING_API_KEY,
                    virustotal_key=settings.VIRUSTOTAL_API_KEY,
                )
                extracted_results.append(url_result)

    # Fuse scores into overall verdict
    overall = calculate_overall_verdict(extracted_results)

    # Generate plain-language explanation and recommended action
    explanation, recommended_action = generate_explanation_and_action(
        overall=overall,
        items=extracted_results,
        llm_api_key=settings.LLM_API_KEY,
    )

    elapsed_ms = max(int((time.perf_counter() - start_time) * 1000), 1)

    return ScanResponse(
        scan_id=str(uuid.uuid4()),
        overall=overall,
        partial=False,
        latency_ms=elapsed_ms,
        items=extracted_results,
        explanation=explanation,
        recommendedAction=recommended_action,
    )
