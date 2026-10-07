from app.schemas.scan import ExtractedItemResult, OverallVerdict, VerdictType


def calculate_overall_verdict(items: list[ExtractedItemResult]) -> OverallVerdict:
    """
    Fuses multiple item scores into a single cohesive verdict.
    The most severe item dominates the score, adjusted by secondary flags.
    """
    if not items:
        return OverallVerdict(verdict="Safe", score=0)

    scores = [it.score for it in items]
    max_score = max(scores)

    # If multiple items have elevated risk, add a small compound penalty
    elevated_count = sum(1 for s in scores if s >= 25)
    compound_penalty = min((elevated_count - 1) * 5, 15) if elevated_count > 1 else 0

    fused_score = min(max_score + compound_penalty, 100)

    if fused_score >= 60:
        verdict: VerdictType = "Dangerous"
    elif fused_score >= 25:
        verdict: VerdictType = "Suspicious"
    else:
        verdict: VerdictType = "Safe"

    return OverallVerdict(verdict=verdict, score=fused_score)
