import type { FC } from 'react';
import { SCENARIOS } from '../data/mockScans';
import type { Scenario } from '../data/mockScans';
import { Crosshair, QrCode, FileText, ShieldCheck } from 'lucide-react';

interface SandboxScenariosProps {
  onSelectScenario: (scenario: Scenario) => void;
}

export const SandboxScenarios: FC<SandboxScenariosProps> = ({
  onSelectScenario,
}) => {
  const getBadgeClass = (category: Scenario['category']) => {
    switch (category) {
      case 'QR Code Scanner':
        return 'scenario-badge-purple';
      case 'Text Analyzer':
        return 'scenario-badge-danger';
      case 'Verified Safe':
        return 'scenario-badge-safe';
    }
  };

  const getIcon = (category: Scenario['category']) => {
    switch (category) {
      case 'QR Code Scanner':
        return <QrCode size={13} />;
      case 'Text Analyzer':
        return <FileText size={13} />;
      case 'Verified Safe':
        return <ShieldCheck size={13} />;
    }
  };

  return (
    <section className="demo-sandbox-section" id="sandbox">
      <div className="sandbox-header">
        <h2 className="sandbox-title">Interactive QR & Text Detection Sandbox</h2>
        <p className="sandbox-sub">
          Test the two core SafeLens engines: On-Device QR Decoding and OCR Text Scam Analysis.
        </p>
      </div>

      <div className="scenarios-grid">
        {SCENARIOS.map((scenario) => {
          return (
            <div key={scenario.id} className="scenario-card">
              <div>
                <div className={`scenario-type-badge ${getBadgeClass(scenario.category)}`}>
                  {getIcon(scenario.category)}
                  <span>{scenario.category}</span>
                </div>

                <h3 className="scenario-card-title">
                  {scenario.title}
                </h3>
                <p className="scenario-card-desc">
                  {scenario.description}
                </p>

                <div className="scenario-preview-box">
                  {scenario.inputType === 'qr' ? (
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="scenario-qr-wrapper">
                        {/* Inline SVG QR Code */}
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4-2h2v2h-2v-2zm4-4h2v2h-2V8zm-4 8h2v4h-2v-4z" />
                        </svg>
                      </div>
                      <div className="scenario-preview-text">
                        {scenario.previewText}
                      </div>
                    </div>
                  ) : (
                    <div className="scenario-preview-text">
                      {scenario.previewText}
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn-snip-sample"
                onClick={() => onSelectScenario(scenario)}
                title="Snip and analyze this scenario"
              >
                <Crosshair size={14} />
                <span>Test {scenario.category} Sample</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
