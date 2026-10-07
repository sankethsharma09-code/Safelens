# SafeLens Desktop App (Frontend)

The lightweight desktop application for SafeLens. Runs quietly in the system tray. Press the global hotkey (`Ctrl + Shift + Space`) to freeze the display with a crosshair, drag a selection box around a **QR code** or **suspicious text block**, and review a real-time security verdict (**Safe / Suspicious / Dangerous**) in an always-on-top slide-in panel.

---

## Scoped Capabilities

The desktop client is dedicated strictly to:
1. **QR Code Scanner**: Snip-and-scan on-screen QR codes, decoded 100% on-device. Destination URLs/payloads are audited against threat feeds without auto-executing them.
2. **Text Analyzer**: On-device OCR of the selected screen region or typed/pasted text, detecting social engineering, urgency lures, and malicious embedded links.

All other legacy features (history logging, community reporting, threat feeds, call checking) have been removed.

---

## User Flow

```
1. SafeLens runs in background / system tray.
2. User presses global hotkey (Ctrl + Shift + Space).
3. Active display freezes with dimmed backdrop and crosshair cursor.
4. User drags a rectangle over a QR code or text block (Esc cancels).
5. App crops the region and processes it ON-DEVICE:
   - jsqr / zxing-wasm decodes any QR code present.
   - tesseract.js extracts visible text via OCR.
6. Extracted payloads sent to scan endpoint (POST /api/v1/scan).
7. Results panel slides in on right edge (always on top).
8. User reads verdict, risk score (0-100), flagged reasons, and advice.
9. Pressing Esc or clicking outside dismisses the panel.
```

---

## Architecture & Windows

```
Main Process (Node.js)                         Renderer Processes (React)
──────────────────────                         ──────────────────────────
• System tray icon & app lifecycle             • Snip Overlay Window
• Global hotkey registration (Ctrl+Shift+Space)   - Frozen desktop capture
• Multi-monitor desktopCapturer                   - DPI-accurate drag-box selection
• Window management (Overlay & Panel)          • Results Panel Window
• Local settings store                            - Verdict banner (Safe/Suspicious/Dangerous)
• API client (POST /api/v1/scan)                  - Extracted items list
• Secure IPC bridge (preload)                     - Flags & reasons breakdown
                                                  - Copy safe summary
                                                  - Settings (Hotkey & Screen Shield)
```

### Windows Details

1. **Overlay Window**:
   - Transparent, frameless, fullscreen window positioned over the active display.
   - Background displays a high-resolution frozen screenshot captured via `desktopCapturer`.
   - Normalizes CSS mouse coordinates to native display pixel coordinates using `display.scaleFactor`.
2. **Results Panel Window**:
   - Frameless, always-on-top side panel docked to the right edge (`height: 100vh`, `width: ~420px`).
   - `alwaysOnTop: true` with level `'screen-saver'` and `skipTaskbar: true`.
   - Content Protection: `win.setContentProtection(true)` prevents video conferences and screen recordings from capturing the panel.

---

## On-Device Processing

- **QR Decoding**: Handled in-memory via `jsqr` or WebAssembly ZXing. Payloads are extracted directly from canvas pixel buffers.
- **OCR Text Extraction**: Handled in-memory using `tesseract.js` worker threads. Supports English, Hindi, and regional scripts.
- **Privacy Assurance**: The screenshot buffer is released immediately after extraction. No image data is written to disk or sent over the network.

---

## Results Panel UI Specification

### 1. Verdict Tab
- **Status Banner**:
  - **Dangerous** (Score 60–100): Crimson red styling, warning icon, "High Scam Likelihood".
  - **Suspicious** (Score 25–59): Amber gold styling, caution icon, "Suspicious Content".
  - **Safe** (Score 0–24): Emerald green styling, check icon, "Verified Safe".
- **Plain-Language Summary**: Explains why the snippet was flagged.
- **Recommended Action**: Clear immediate next steps (e.g., "Do not navigate to destination. Never share OTP or credentials.").
- **Extracted Items**:
  - Displays each extracted item with kind pill (`qr`, `text`, `url`) and risk score.
  - Plain text payload rendering (links are strictly non-clickable to prevent accidental opening).
  - Flag breakdown chips with detail explanations.
- **Footer**: "Copy Summary" button to safely copy plain-text advice to clipboard.

### 2. Settings Tab
- **Global Hotkey**: Configures or displays the activation hotkey (`Ctrl + Shift + Space`).
- **Screen Sharing Shield**: Toggle for window content protection (`setContentProtection`).

---

## Setup & Development

```bash
cd frontend
npm install
npm run dev
```

### Build & Typecheck
```bash
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```
