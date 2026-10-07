# SafeLens: Snip-and-Scan Scam Protection

> Global hotkey, screen freeze overlay, and instant on-device analysis for **QR codes** and **suspicious text**.

Built for cybersecurity awareness and real-time fraud defense. SafeLens is strictly focused on two core capabilities:
1. **QR Code Scanner**: Snip-and-scan any QR code on screen (hotkey → frozen overlay → drag box → on-device QR decode).
2. **Text Analyzer**: On-device OCR extraction of selected screen regions or typed/pasted text, followed by phishing/scam risk scoring (including security evaluation of links discovered inside the QR code or text).

---

## The Two Core Features

### 1. QR Code Scanner
- **Interaction**: Trigger with global hotkey (`Ctrl + Shift + Space`) or manual button.
- **Screen Freeze**: Displays a high-DPI frozen desktop screenshot with a crosshair cursor.
- **On-Device Decoding**: Decodes QR code payloads locally without sending screenshots to any server.
- **Verdict & Analysis**: Inspects the destination URL, payment schemes, or payload structure for phishing, deceptive redirects, and malicious intent.

### 2. Text Analyzer
- **Extraction**: Local OCR extracts text from the selected screen region. Supports pasted/typed text as well.
- **Phishing & Fraud Scoring**: Evaluates urgency markers, authority impersonation, credential harvesting language, and fake security alerts.
- **Embedded Link Checks**: Any URL extracted from the text or QR payload is cross-referenced against threat intelligence feeds (Google Safe Browsing, PhishTank, URLhaus) and checked for lookalike/homoglyph spoofing.

---

## User Flow

```
Global Hotkey (Ctrl+Shift+Space) 
  → Screen freezes with dimmed overlay & crosshair 
  → User drags a crop rectangle over a QR code or text block
  → App extracts payload ON-DEVICE (QR decode or OCR)
  → Extracted text / QR payload sent to scan analyzer
  → Results panel slides in on the right edge (always on top)
  → Clear verdict displayed: Safe / Suspicious / Dangerous with actionable advice
```

---

## Privacy & Security Guarantees

- **Zero Screenshot Uploads**: Screenshots are cropped and processed entirely in memory on the client machine. No image files or pixels are ever transmitted to the backend.
- **Non-Clickable Payloads**: Detected links and QR payloads are rendered as non-clickable plain text with a Copy Summary option to prevent accidental user execution.
- **Screen Sharing Shield**: Content protection setting (`setContentProtection(true)`) prevents the SafeLens inspector panel from being captured in video conferences or screen shares.
- **No Unnecessary Storage**: No local history retention of sensitive snips, and server-side logs store keyed hashes only.

---

## Architecture Overview

```
Desktop App (Electron + React)
  ├── Global hotkey listener (Ctrl + Shift + Space) & tray launcher
  ├── Overlay Window (screen freeze, DPI-accurate cropping)
  ├── On-device extraction (QR decoder + OCR)
  └── Inspector Panel (Verdict, Risk Score 0-100, Explanations, Settings)
          │
          │ HTTPS (POST /api/v1/scan: "qr" and "text" items only)
          ▼
Backend API (FastAPI)
  ├── Rule engine & ML text scoring (urgency, credential harvest, coercion)
  ├── Threat Intelligence (Google Safe Browsing, VirusTotal, URLhaus, PhishTank)
  └── Scoring fusion → Verdict (Safe / Suspicious / Dangerous)
```

---

## Project Structure

```
Semlens/
├── README.md              # Root project overview and architecture
├── readme/
│   ├── README2.md         # Backend API & service contracts
│   ├── README3.md         # Database schema & storage design
│   ├── README 4.md        # Architecture & specifications
│   └── README5.md         # Desktop app & electron implementation
└── frontend/              # React + TypeScript + Vite UI
    ├── src/
    │   ├── components/    # Navbar, Hero, SnipOverlay, ResultsPanel, SandboxScenarios
    │   ├── data/          # Mock test scan scenarios (QR & Text)
    │   └── types/         # Item kinds ('qr' | 'text' | 'url'), verdicts, flags
    └── package.json
```
