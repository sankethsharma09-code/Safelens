import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProcessSection } from './components/ProcessSection';
import { SandboxScenarios } from './components/SandboxScenarios';
import { SnipOverlay } from './components/SnipOverlay';
import { ResultsPanel } from './components/ResultsPanel';
import { Toast } from './components/Toast';
import { SCENARIOS } from './data/mockScans';
import type { Scenario } from './data/mockScans';
import type { ScanResult } from './types';
import { Crosshair } from 'lucide-react';

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('safelens-theme') as 'dark' | 'light' | null;
      return savedTheme || 'dark';
    }
    return 'dark';
  });
  const [isSnipOverlayOpen, setIsSnipOverlayOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(SCENARIOS[0].result);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const triggerSnipSession = () => {
    setIsSnipOverlayOpen(true);
  };

  // Synchronize theme attribute on HTML root
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('safelens-theme', nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
  };

  // Global hotkey listener (Ctrl + Shift + Space) as defined in README4 and README5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setIsSnipOverlayOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleScenarioSelected = (scenario: Scenario) => {
    setIsPanelOpen(true);
    setIsAnalyzing(true);
    setScanResult(null);

    setTimeout(() => {
      setScanResult(scenario.result);
      setIsAnalyzing(false);
    }, 600);
  };

  const handleSnipComplete = (scenario?: Scenario) => {
    setIsSnipOverlayOpen(false);
    const selected = scenario || SCENARIOS[0];
    handleScenarioSelected(selected);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Aurora Ambient Mesh Glows */}
      <div className="aurora-bg">
        <div className="aurora-glow-left"></div>
        <div className="aurora-glow-center"></div>
      </div>

      {/* Floating Curved Fixed Navbar (pinned permanently to top on scroll) */}
      <div className="nav-floating-wrapper">
        <Navbar
          onOpenSnip={triggerSnipSession}
          onOpenPanel={() => setIsPanelOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Main Reference Card Frame */}
      <div className="frame-wrapper">
        <main className="reference-card">
          {/* Hero Section */}
          <Hero onStartSnip={triggerSnipSession} />

          {/* Process Section (Snip -> QR/OCR on-device -> Verdict) */}
          <ProcessSection onStartSnip={triggerSnipSession} />

          {/* Interactive QR & Text Detection Sandbox */}
          <SandboxScenarios onSelectScenario={handleScenarioSelected} />
        </main>
      </div>

      {/* Floating Snip Hotkey Launcher Button */}
      <div className="floating-snip-container">
        <button
          onClick={triggerSnipSession}
          className="floating-snip-btn"
          title="Press Ctrl+Shift+Space or Click to Snip"
        >
          <Crosshair size={16} />
          <span>Snip Tool (Ctrl+Shift+Space)</span>
        </button>
      </div>

      {/* Full-screen Crosshair Snip Overlay */}
      {isSnipOverlayOpen && (
        <SnipOverlay
          onClose={() => setIsSnipOverlayOpen(false)}
          onSnipComplete={handleSnipComplete}
        />
      )}

      {/* Right Edge Results Panel */}
      <ResultsPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        isAnalyzing={isAnalyzing}
        scanResult={scanResult}
        onShowToast={showToast}
      />

      {/* Feedback Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
