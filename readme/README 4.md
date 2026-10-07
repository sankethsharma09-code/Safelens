# SafeLens: Snip-and-Scan Scam Protection for Desktop

> Press a global hotkey, drag a selection box around a **QR code** or **suspicious text block**, and receive an immediate verdict (**Safe, Suspicious, or Dangerous**) explaining why and what actions to take.

Domain: **Cybersecurity & AI/ML Scam Defense**.

---

## The Two Core Features

SafeLens is scoped strictly down to two capabilities:
1. **QR Code Scanner**: Snip-and-scan on-screen QR codes. Screen freezes, user selects region, QR code is decoded on-device, and embedded destination URLs/payloads are audited for security threats.
2. **Text Analyzer**: On-device OCR extraction of selected screen areas (or direct typed/pasted text). Evaluates language for social engineering, urgency, credential harvesting, and inspects embedded links against threat intelligence feeds.

---

## Documentation Index

| Component | Path | Description |
|---|---|---|
| Desktop App | `frontend/` & `readme/README5.md` | Electron + React desktop client, overlay window, on-device OCR/QR, results panel |
| Backend API | `readme/README2.md` | FastAPI scan orchestrator (`POST /api/v1/scan` for "qr" and "text" items) |
| Database | `readme/README3.md` | PostgreSQL indicator cache & scan logs, local SQLite configuration |

---

## Interaction Flow

```
1. Global Hotkey (Ctrl + Shift + Space) triggers screen freeze
2. Dimmed crosshair overlay lets user drag a crop rectangle
3. Region is decoded locally on-device:
   - QR barcode decode (jsqr / pyzbar)
   - Text OCR extraction (tesseract.js / Apple Vision)
4. Extracted payload sent to backend via POST /api/v1/scan (kind: "qr" | "text")
5. Backend verifies embedded links against threat feeds & runs NLP scam rules
6. Inspector panel slides open on the right edge with verdict, score, and advice
```

---

## Privacy Principles

- **Zero Screenshot Uploads**: Screenshots are cropped and processed in memory on the user's computer. The backend never receives image pixels.
- **Payload Sanitization**: Embedded links are rendered safely as plain text to prevent accidental clicks.
- **Screen Sharing Shield**: Built-in OS-level window protection hides the inspector panel from screen recorders and video calls.
- **No Sensitive Log Retention**: No local history retention of scanned snips, and server-side logs store keyed HMAC hashes only.
