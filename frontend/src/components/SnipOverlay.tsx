import { useState, useEffect } from 'react';
import type { FC, MouseEvent } from 'react';
import { Crosshair, X } from 'lucide-react';
import { SCENARIOS } from '../data/mockScans';
import type { Scenario } from '../data/mockScans';
import type { DisplayMetadata } from '../types/electron';

interface SnipOverlayProps {
  onClose: () => void;
  onSnipComplete: (scenario?: Scenario) => void;
}

export const SnipOverlay: FC<SnipOverlayProps> = ({ onClose, onSnipComplete }) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [capturedScreen, setCapturedScreen] = useState<string | null>(null);
  const [displayMeta, setDisplayMeta] = useState<DisplayMetadata | null>(null);

  // Listen to desktopCapturer image sent from Electron main process
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onDisplayCapture((payload) => {
        setCapturedScreen(payload.dataUrl);
        setDisplayMeta(payload.display);
        setStartPos(null);
        setCurrentPos(null);
        setIsDragging(false);
      });
      return () => unsubscribe();
    }
  }, []);

  // Handle Escape key to dismiss snip and notify main process
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (window.electronAPI) {
          window.electronAPI.cancelSnip();
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.cancelSnip();
    }
    onClose();
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !startPos) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (!isDragging || !startPos || !currentPos) return;
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);

    setIsDragging(false);

    // Minimum box size 20px
    if (width > 20 && height > 20) {
      if (window.electronAPI) {
        // Send CSS pixel coordinates along with display metadata (scaleFactor) to main process
        window.electronAPI.sendCroppedRegion({
          rect: { x: left, y: top, width, height },
          display: displayMeta || undefined,
        });
      } else {
        // Browser fallback: pick first scenario
        onSnipComplete(SCENARIOS[0]);
      }
    } else {
      setStartPos(null);
      setCurrentPos(null);
    }
  };

  const getSelectionStyles = () => {
    if (!startPos || !currentPos) return { display: 'none' };
    const left = Math.min(startPos.x, currentPos.x);
    const top = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  return (
    <div
      className="snip-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Frozen Desktop Capture Backdrop */}
      {capturedScreen && (
        <img
          src={capturedScreen}
          alt="Frozen Desktop Capture"
          className="snip-frozen-backdrop"
          draggable={false}
        />
      )}

      {/* Dimmed Veil */}
      <div className="snip-dimmed-veil" />

      {/* Top Banner Guide */}
      <div className="snip-overlay-header">
        <Crosshair size={18} color="#c084fc" />
        <span>Drag a box around any suspicious text, URL, or QR code on screen (Esc to cancel)</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="snip-header-close-btn"
          title="Cancel Snip (Esc)"
          aria-label="Cancel Snip"
        >
          <X size={14} />
        </button>
      </div>

      {/* Browser fallback quick target picker */}
      {!window.electronAPI && (
        <div
          className="snip-quick-targets-bar"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="snip-quick-targets-label">
            Or select test target:
          </span>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => onSnipComplete(sc)}
              className="snip-quick-target-btn"
            >
              {sc.title.split(' ')[0]} {sc.title.split(' ')[1]}
            </button>
          ))}
        </div>
      )}

      {/* Selection Box */}
      {isDragging && <div className="snip-selection-rect" style={getSelectionStyles()} />}
    </div>
  );
};
