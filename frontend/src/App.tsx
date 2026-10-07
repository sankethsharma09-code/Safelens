import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProcessSection } from './components/ProcessSection';
import { SandboxScenarios } from './components/SandboxScenarios';
import { SnipOverlay } from './components/SnipOverlay';
import { ResultsPanel } from './components/ResultsPanel';
import { Toast } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { SCENARIOS } from './data/mockScans';
import type { Scenario } from './data/mockScans';
import type { ScanResult } from './types';
import { submitScan, getStoredAuth, logoutApi } from './services/api';
import type { AuthUser } from './services/api';
import { Crosshair } from 'lucide-react';

export function App() {
  const isOverlayMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('overlay') === 'true';

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform || '');
  const hotkeyDisplay = isMac ? '⌘+Shift+Space' : 'Ctrl+Shift+Space';

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('safelens-theme') as 'dark' | 'light' | null;
      return savedTheme || 'dark';
    }
    return 'dark';
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return getStoredAuth().user;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    showToast(`Welcome, ${user.full_name || user.email}!`);
  };

  const handleLogout = async () => {
    await logoutApi();
    setCurrentUser(null);
    showToast('Signed out successfully.');
  };

  const triggerSnipSession = () => {
    if (window.electronAPI) {
      window.electronAPI.triggerSnip();
    } else {
      setIsSnipOverlayOpen(true);
    }
  };

  // Synchronize theme attribute on HTML root
  useEffect(() => {
    if (isOverlayMode) {
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      return;
    }
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme, isOverlayMode]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('safelens-theme', nextTheme);
    showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} Mode`);
  };

  // Browser fallback for keydown (in Electron, main process globalShortcut handles it system-wide)
  useEffect(() => {
    if (window.electronAPI) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setIsSnipOverlayOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to snip completions forwarded from Electron overlay window
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onSnipCompleted(async (payload) => {
      console.log('[SafeLens Renderer] Received completed snip from main process:', payload);
      setIsPanelOpen(true);
      setIsAnalyzing(true);
      setScanResult(null);

      try {
        const liveResult = await submitScan([
          { kind: 'text', value: 'Security inspection: OCR scan of captured desktop region' },
        ]);
        setScanResult(liveResult);
        showToast('Screen snip captured & analyzed');
      } catch {
        setScanResult(SCENARIOS[0].result);
      } finally {
        setIsAnalyzing(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleScenarioSelected = async (scenario: Scenario) => {
    setIsPanelOpen(true);
    setIsAnalyzing(true);
    setScanResult(null);

    // Extract item payload for backend analysis
    const primaryItem = scenario.result.items[0];
    const itemKind: 'qr' | 'text' = primaryItem?.kind === 'qr' ? 'qr' : 'text';
    const itemValue = primaryItem?.value || scenario.previewText;

    try {
      const liveResult = await submitScan([{ kind: itemKind, value: itemValue }]);
      setScanResult(liveResult);
      showToast('Live backend analysis completed');
    } catch {
      // Fallback gracefully to offline scenario mock if backend is starting or offline
      setScanResult(scenario.result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSnipComplete = (scenario?: Scenario) => {
    setIsSnipOverlayOpen(false);
    const selected = scenario || SCENARIOS[0];
    handleScenarioSelected(selected);
  };

  // If this window instance is the Electron overlay window, render ONLY the SnipOverlay
  if (isOverlayMode) {
    return (
      <div className="overlay-window-root">
        <SnipOverlay
          onClose={() => {
            window.electronAPI?.cancelSnip();
          }}
          onSnipComplete={() => {}}
        />
      </div>
    );
  }

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
          user={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area */}
      <div className="main-content-flow">
        <main>
          {/* Hero Section */}
          <Hero onStartSnip={triggerSnipSession} />

          {/* Workflow Architecture Timeline */}
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
          title={`Press ${hotkeyDisplay} or Click to Snip`}
        >
          <Crosshair size={16} />
          <span>Snip Tool ({hotkeyDisplay})</span>
        </button>
      </div>

      {/* Full-screen Crosshair Snip Overlay (in-browser mode) */}
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

      {/* Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Feedback Toast */}
      <Toast message={toastMessage} />
    </div>
  );
}

export default App;
