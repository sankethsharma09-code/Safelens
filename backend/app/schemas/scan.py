from typing import Literal
from pydantic import BaseModel, Field, field_validator

VerdictType = Literal["Safe", "Suspicious", "Dangerous"]
InputItemKind = Literal["qr", "text"]
OutputItemKind = Literal["qr", "text", "url"]


class Flag(BaseModel):
    label: str = Field(description="Short human-readable category for the signal")
    detail: str = Field(description="Evidence or contextual explanation of the flag")


class ScanItemInput(BaseModel):
    kind: str = Field(description="Item kind. Only 'qr' and 'text' are supported")
    value: str = Field(description="Scanned payload content")

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("qr", "text"):
            raise ValueError("Unsupported item kind. Only 'qr' and 'text' are supported.")
        return clean


class ScanRequest(BaseModel):
    items: list[ScanItemInput] = Field(min_length=1, description="List of items extracted from screen crop")
    context: dict | None = Field(default_factory=lambda: {"language": "en"})


class ExtractedItemResult(BaseModel):
    id: str
    kind: OutputItemKind
    value: str
    verdict: VerdictType
    score: int = Field(ge=0, le=100)
    flags: list[Flag] = Field(default_factory=list)
    explanation: str


class OverallVerdict(BaseModel):
    verdict: VerdictType
    score: int = Field(ge=0, le=100)


class ScanResponse(BaseModel):
    scan_id: str
    overall: OverallVerdict
    partial: bool = False
    latency_ms: int
    items: list[ExtractedItemResult]
    explanation: str
    recommendedAction: str
