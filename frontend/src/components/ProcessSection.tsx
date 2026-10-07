import type { FC } from 'react';
import { Terminal, Cpu, ShieldCheck, Crosshair } from 'lucide-react';

interface ProcessSectionProps {
  onStartSnip: () => void;
}

export const ProcessSection: FC<ProcessSectionProps> = ({ onStartSnip }) => {
  return (
    <section className="process-section" id="pipeline">
      {/* Left Column */}
      <div className="process-left">
        <span className="process-tag">Inspect instantly</span>
        <h2 className="process-heading">No raw screenshots sent.</h2>
        <p className="process-desc">
          SafeLens automatically decodes QR codes and runs optical character recognition directly in your device’s memory.
          Zero raw screenshots reach the cloud—only extracted cryptographic hashes, URLs, and text tokens are analyzed against threat intel feeds.
        </p>

        <button className="btn-pill-primary" onClick={onStartSnip}>
          <Crosshair size={16} />
          <span>Snip Now</span>
        </button>
      </div>

      {/* Right Column: 3-step vertical timeline */}
      <div className="process-timeline">
        <div className="timeline-line"></div>

        {/* Step 1 */}
        <div className="timeline-step active">
          <div className="timeline-dot">
            <Terminal size={14} className="timeline-icon-purple" />
          </div>
          <div className="timeline-content">
            <span className="timeline-symbol-purple">$</span>
            <span>hotkey triggered: Ctrl + Shift + Space</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="timeline-step active">
          <div className="timeline-dot">
            <Cpu size={14} className="timeline-icon-blue" />
          </div>
          <div className="timeline-content">
            <span className="timeline-symbol-blue">•</span>
            <span>On-device QR & OCR: Extracted QR payload & text block</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="timeline-step active">
          <div className="timeline-dot">
            <ShieldCheck size={14} className="timeline-icon-red" />
          </div>
          <div className="timeline-content">
            <span className="timeline-symbol-red">✓</span>
            <span>Verdict delivered in 540ms: DANGEROUS (Score 94/100)</span>
          </div>
        </div>
      </div>
    </section>
  );
};
