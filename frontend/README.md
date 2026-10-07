# SafeLens Desktop UI (React + Vite)

The frontend interface for SafeLens, providing the interactive **snip-and-scan overlay** and the **side-docked inspector panel**.

---

## Features

1. **QR Code Scanner**: Crosshair crop tool, on-device QR barcode decoding, and malicious URL inspection.
2. **Text Analyzer**: On-device OCR text extraction, phishing and social engineering risk scoring, and embedded link verification.

---

## Available Scripts

- `npm run dev`: Starts the Vite development server (hot module replacement).
- `npm run build`: Compiles TypeScript with `tsc -b` and builds production bundle with Vite.
- `npm run lint`: Runs `oxlint` for high-performance static analysis.
- `npm run preview`: Locally previews the production build.

---

## UI Components

- `SnipOverlay.tsx`: Interactive screen-freeze canvas overlay with crosshair cursor and drag-to-select box.
- `ResultsPanel.tsx`: Right-edge slide-in inspector panel with Verdict view (banners, extracted items, flag chips, copy summary) and Settings view (hotkey, screen sharing shield).
- `SandboxScenarios.tsx`: Interactive test runner featuring QR phishing, urgent scam text, and verified safe scenarios.
- `Hero.tsx`: Main dashboard display with live snip launch triggers and global hotkey hint (`Ctrl + Shift + Space`).
- `Navbar.tsx`: Floating header with Dark / Light mode toggle and section anchors.
