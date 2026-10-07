# SafeLens Backend

FastAPI service behind the SafeLens desktop application. The desktop app captures a screen region, extracts QR payloads and text **on the user's machine**, and submits only those items here. The backend analyses them and returns a single unified verdict (**Safe / Suspicious / Dangerous**) with plain-language explanations.

---

## Scoped Focus

SafeLens is restricted strictly to two capabilities:
1. **QR Code Scanner**: Validates QR payloads, decoding URLs or parameters and checking embedded destinations against threat intelligence.
2. **Text Analyzer**: Evaluates text for social engineering, urgent coercion, credential harvesting, and audits embedded links.

All out-of-scope features (audio call checks, community reporting, alerts feeds, feedback mechanisms, and payment screenshot checks) have been removed.

---

## Design Principles

- **No Images Transmitted**: The client sends extracted text or QR payloads, never screenshots or raw image buffers.
- **Strict Endpoint Validation**: `POST /api/v1/scan` strictly accepts `"qr"` and `"text"` items. Any other `kind` returns an immediate `400 Bad Request`.
- **Embedded Link Auditing**: URLs discovered inside QR codes or extracted text are normalized and cross-referenced with threat intelligence feeds.
- **Privacy by Default**: Hash-based logging (HMAC with secret pepper). No raw user input logged.

---

## Stack

- Python 3.10+, FastAPI, Uvicorn, Pydantic v2
- PostgreSQL (SQLAlchemy 2.0 + asyncpg, Alembic migrations), Redis (verdict cache, rate limits)
- httpx (async calls to threat-intel APIs)
- Threat Intel: Google Safe Browsing, VirusTotal, URLhaus, PhishTank
- ML & NLP: Rule engine + scikit-learn text classifier for phishing/scam signals
- LLM API (optional): Plain-language explanation generation with template fallbacks

---

## Folder Structure

```
backend/
├── README.md
├── requirements.txt
├── .env.example
├── docker-compose.yml          # api + postgres + redis
├── alembic/                    # migrations
├── app/
│   ├── main.py                 # app entrypoint, routers, middleware
│   ├── config.py               # settings from env
│   ├── deps.py                 # DB session, Redis, auth (device token)
│   ├── routers/
│   │   ├── scan.py             # POST /api/v1/scan (main endpoint - qr & text only)
│   │   └── devices.py          # POST /api/v1/devices/register
│   ├── services/
│   │   ├── orchestrator.py     # parses qr/text, triggers checks in parallel, fuses scores
│   │   ├── url_analyzer.py     # checks links found inside QR or text
│   │   ├── text_analyzer.py    # scam rule engine + NLP classifier
│   │   ├── scoring.py          # score fusion (Safe / Suspicious / Dangerous)
│   │   ├── explain.py          # plain-language explanation generator
│   │   └── providers/          # safe_browsing.py, virustotal.py, urlhaus.py, phishtank.py
│   ├── models/                 # SQLAlchemy models (devices, scans, scan_items, scam_rules, indicators)
│   └── schemas/                # Pydantic models
└── tests/
    ├── test_scan.py            # scan endpoint validation tests
    └── test_rules.py           # phishing & scam pattern unit tests
```

---

## API Endpoints

### 1. `POST /api/v1/devices/register`
Registers an anonymous desktop installation.
```json
// Request
{ "platform": "windows", "app_version": "0.1.0" }

// Response
{ "device_id": "uuid", "token": "..." }
```

### 2. `POST /api/v1/scan`
Primary scanning endpoint. Accepts only `"qr"` and `"text"` items.

> **Validation Rule**: If any item has a `kind` other than `"qr"` or `"text"`, the server returns `400 Bad Request` with `{"error": "Unsupported item kind. Only 'qr' and 'text' are supported."}`.

```json
// Request
{
  "items": [
    { "kind": "qr", "value": "https://secure-login.bank-update.xyz/verify" },
    { "kind": "text", "value": "URGENT: Your bank account will be suspended within 24 hours. Verify now." }
  ],
  "context": { "language": "en" }
}
```

```json
// Response
{
  "scan_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "overall": {
    "verdict": "Dangerous",
    "score": 88
  },
  "partial": false,
  "latency_ms": 320,
  "items": [
    {
      "id": "item-1",
      "kind": "qr",
      "value": "https://secure-login.bank-update.xyz/verify",
      "verdict": "Dangerous",
      "score": 92,
      "flags": [
        { "label": "Lookalike Domain", "detail": "Impersonates legitimate financial portal" },
        { "label": "Phishing Feed Match", "detail": "Flagged on URLhaus / OpenPhish" }
      ],
      "explanation": "QR code resolves to a known credential-harvesting phishing page."
    },
    {
      "id": "item-2",
      "kind": "text",
      "value": "URGENT: Your bank account will be suspended...",
      "verdict": "Dangerous",
      "score": 84,
      "flags": [
        { "label": "Artificial Urgency", "detail": "Coercive countdown language detected" },
        { "label": "Account Threat", "detail": "Claims impending account suspension" }
      ],
      "explanation": "Text contains classic social engineering patterns designed to induce panic."
    }
  ],
  "explanation": "High scam likelihood: The text induces false urgency, and the QR destination is a verified phishing portal.",
  "recommendedAction": "Do not visit the destination link. Never enter account credentials or OTP codes."
}
```

### 3. `GET /health`
Liveness check returning service status.

---

## Scan Processing Pipeline

```
1. Validate payload: ensure items contain ONLY "qr" and/or "text" kinds. Return 400 otherwise.
2. In parallel:
   - For "text": run regex rule engine (urgency, credential lures, authority threats) + ML scam classifier.
   - For "qr": inspect payload format. If a URL is contained inside the QR, route to url_analyzer.
   - If URLs are discovered inside "text", extract and audit via url_analyzer.
3. URL Analyzer:
   - Check Redis cache -> Check local indicators table -> Query threat feeds (Safe Browsing, VirusTotal).
   - Evaluate domain homoglyphs / typosquatting.
4. Score Fusion (scoring.py):
   - Computes weighted risk score (0 - 100).
   - Score >= 60: Dangerous
   - Score 25 - 59: Suspicious
   - Score < 25: Safe
5. Explain (explain.py): generates concise, plain-language advisory.
```

---

## Security & Privacy Rules

1. **HMAC Pepper**: Server stores HMAC-SHA-256 hashes of values, never plaintext passwords or sensitive details.
2. **No SSRF**: Embedded URLs are validated against private IP ranges before any redirect expansion.
3. **No External Execution**: Payloads are never executed, downloaded, or automatically opened.
