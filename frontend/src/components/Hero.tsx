import type { FC } from 'react';
import { ArrowRight, Crosshair } from 'lucide-react';

interface HeroProps {
  onStartSnip: () => void;
  onOpenPanel?: () => void;
}

export const Hero: FC<HeroProps> = ({ onStartSnip }) => {
  return (
    <section className="hero-section">
      {/* Pill badge matching scoped features */}
      <div className="pill-badge" onClick={onStartSnip}>
        <span className="badge-tag">Scoped MVP</span>
        <span className="badge-title">Dedicated QR Code Scanner & Text Scam Analyzer</span>
        <ArrowRight size={13} style={{ marginLeft: 2 }} className="badge-arrow" />
      </div>

      {/* Main Headline */}
      <h1 className="hero-title">
        Snip QR Codes & Text.
        <br className="desktop-break" />
        Detect Scams Instantly.
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Instant on-device QR decoding and OCR text analysis. Detect phishing links, deceptive payloads, and urgent scam messages right on your desktop with zero raw screenshots sent to the cloud.
      </p>

      {/* CTA Button Group */}
      <div className="hero-cta-group">
        <button className="btn-pill-primary" onClick={onStartSnip}>
          <Crosshair size={16} />
          <span>Launch Snip Tool</span>
        </button>
      </div>

      {/* Keyboard hotkey hint */}
      <div className="hero-hotkey-hint">
        <span>Global hotkey:</span>
        <span className="kbd">Ctrl</span>
        <span>+</span>
        <span className="kbd">Shift</span>
        <span>+</span>
        <span className="kbd">Space</span>
      </div>
    </section>
  );
};
