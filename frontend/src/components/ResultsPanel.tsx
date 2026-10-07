import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  X,
  ShieldAlert,
  Copy,
  Check,
  QrCode,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';
import type { ScanResult, ItemKind } from '../types';

interface ResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAnalyzing: boolean;
  scanResult: ScanResult | null;
  onShowToast: (message: string) => void;
}

export const ResultsPanel: FC<ResultsPanelProps> = ({
  isOpen,
  onClose,
  isAnalyzing,
  scanResult,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'settings'>('result');
  const [copied, setCopied] = useState(false);

  // Settings state
  const [contentProtection, setContentProtection] = useState(true);
  const hotkey = 'Ctrl + Shift + Space';

  // Handle Escape key to dismiss panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopySummary = () => {
    if (!scanResult) return;
    const summary = `SafeLens Scan Report:
Verdict: ${scanResult.overall.verdict.toUpperCase()} (Risk Score: ${scanResult.overall.score}/100)
Summary: ${scanResult.explanation}
Advice: ${scanResult.recommendedAction}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    onShowToast('Safe summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getItemIcon = (kind: ItemKind) => {
    switch (kind) {
      case 'qr':
        return <QrCode size={14} color="#c084fc" />;
      case 'url':
        return <LinkIcon size={14} color="#60a5fa" />;
      default:
        return <FileText size={14} color="#94a3b8" />;
    }
  };

  return (
    <>
      {/* Background backdrop overlay for click-outside dismissal */}
      <div
        className="panel-overlay-backdrop"
        onClick={onClose}
        aria-hidden="true"
        title="Click outside to close"
      />

      <aside className="safelens-panel" aria-label="SafeLens Inspector Panel">
        {/* Panel Top Header */}
        <div className="panel-header">
          <div className="panel-header-title">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldAlert size={16} color="#fff" />
            </div>
            <span className="panel-header-title-text">SafeLens Inspector</span>
          </div>

          <button
            onClick={onClose}
            className="panel-close-btn"
            title="Dismiss Inspector (Esc)"
            aria-label="Close Inspector"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs: Verdict and Settings */}
        <div className="panel-tabs">
          <button
            className={`panel-tab-btn ${activeTab === 'result' ? 'active' : ''}`}
            onClick={() => setActiveTab('result')}
            title="Verdict and analysis results"
          >
            Verdict
          </button>
          <button
            className={`panel-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="SafeLens inspector settings"
          >
            Settings
          </button>
        </div>

        {/* Main Panel Content */}
        <div className="panel-content">
          {/* ================= RESULT TAB ================= */}
          {activeTab === 'result' && (
            <>
              {isAnalyzing ? (
                <div className="analyzing-box">
                  <div className="scanner-radar"></div>
                  <h3 className="analyzing-title">Analyzing Snip Region...</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 280, margin: '0 auto' }}>
                    Decoding QR payloads on-device, running Tesseract OCR, and evaluating scam risk...
                  </p>
                  <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <div className="skeleton-line"></div>
                    <div className="skeleton-line" style={{ width: '60%' }}></div>
                  </div>
                </div>
              ) : scanResult ? (
                <>
                  {/* Big Verdict Banner */}
                  <div
                    className={`verdict-banner ${
                      scanResult.overall.verdict === 'Dangerous'
                        ? 'dangerous'
                        : scanResult.overall.verdict === 'Suspicious'
                        ? 'suspicious'
                        : 'safe'
                    }`}
                  >
                    <div className="verdict-left">
                      <div className="verdict-title">
                        {scanResult.overall.verdict === 'Dangerous' && 'High Scam Likelihood'}
                        {scanResult.overall.verdict === 'Suspicious' && 'Suspicious Content'}
                        {scanResult.overall.verdict === 'Safe' && 'Verified Safe'}
                      </div>
                      <div className="verdict-latency">
                        Latency: {scanResult.latency_ms}ms • On-Device Decoded
                      </div>
                    </div>

                    <div className="verdict-right">
                      <div
                        className={`verdict-badge-score score-${scanResult.overall.verdict.toLowerCase()}`}
                      >
                        {scanResult.overall.score}
                        <span className="verdict-score-denom">/100</span>
                      </div>
                      <span className="verdict-score-label">
                        Risk Score
                      </span>
                    </div>
                  </div>

                  {/* Plain-Language Explanation */}
                  <div className="explanation-card">
                    <div className="explanation-heading">Why we flagged this</div>
                    <div className="explanation-text">{scanResult.explanation}</div>
                  </div>

                  {/* Next Steps / Advisory with high-contrast theme styling */}
                  <div className="action-advisory-box">
                    <strong className="action-advisory-title">
                      Recommended Action:
                    </strong>
                    {scanResult.recommendedAction}
                  </div>

                  {/* Itemized Scanned Items (QR and Text only) */}
                  <div className="items-list-section">
                    <div className="extracted-items-header">
                      Extracted Items ({scanResult.items.length})
                    </div>

                    {scanResult.items.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-card-header">
                          <div className="item-card-header-left">
                            {getItemIcon(item.kind)}
                            <span className="item-kind-pill">{item.kind}</span>
                          </div>
                          <span className={`item-verdict-pill item-verdict-${item.verdict.toLowerCase()}`}>
                            {item.verdict} ({item.score}/100)
                          </span>
                        </div>

                        {/* Display item as non-clickable plain text with word-wrap */}
                        <div className="item-value">{item.value}</div>

                        {/* Flags breakdown */}
                        <div className="flags-list">
                          {item.flags.map((flag, idx) => (
                            <div key={idx} className="flag-chip">
                              <span className="flag-chip-bullet">•</span>
                              <div className="flag-chip-text">
                                <strong className="flag-chip-label">{flag.label}:</strong>
                                <span className="flag-chip-detail">{flag.detail}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="panel-empty-state">
                  <p>No active scan in buffer.</p>
                  <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
                    Press <kbd className="kbd">Ctrl+Shift+Space</kbd> or choose a scenario from the sandbox.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ================= SETTINGS TAB ================= */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Local desktop configuration for QR code and text analysis.
              </div>

              {/* Hotkey setting */}
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-title">Global Hotkey</div>
                  <div className="settings-row-desc">
                    Activates crosshair screen overlay
                  </div>
                </div>
                <span className="kbd settings-row-control" style={{ fontSize: '0.76rem', padding: '3px 8px' }}>
                  {hotkey}
                </span>
              </div>

              {/* Content Protection */}
              <div className="settings-row" style={{ borderBottom: 'none' }}>
                <div className="settings-row-info">
                  <div className="settings-row-title">Screen Sharing Shield</div>
                  <div className="settings-row-desc">
                    Hides inspector panel during screen shares
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="settings-row-control"
                  checked={contentProtection}
                  onChange={(e) => setContentProtection(e.target.checked)}
                  style={{ accentColor: '#a855f7', width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Panel Footer Action - Copy Summary */}
        {activeTab === 'result' && scanResult && !isAnalyzing && (
          <div className="panel-footer">
            <button className="btn-secondary" onClick={handleCopySummary} title="Copy Summary" style={{ width: '100%' }}>
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Summary Copied' : 'Copy Summary'}</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
