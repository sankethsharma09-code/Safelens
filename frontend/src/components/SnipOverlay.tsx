import { useState, useEffect } from 'react';
import type { FC, MouseEvent } from 'react';
import { Crosshair, X } from 'lucide-react';
import { SCENARIOS } from '../data/mockScans';
import type { Scenario } from '../data/mockScans';

interface SnipOverlayProps {
  onClose: () => void;
  onSnipComplete: (scenario?: Scenario) => void;
}

export const SnipOverlay: FC<SnipOverlayProps> = ({ onClose, onSnipComplete }) => {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleMouseDown = (e: MouseEvent) => {
    // Only drag on left click
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

    setIsDragging(false);

    // Minimum box size 20px
    if (width > 20 && height > 20) {
      // Pick the first scenario or default
      onSnipComplete(SCENARIOS[0]);
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
      {/* Top Banner Guide */}
      <div className="snip-overlay-header">
        <Crosshair size={18} color="#c084fc" />
        <span>Drag a box around any suspicious text, URL, or QR code on screen</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#cbd5e1',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Floating Quick Targets in case user wants to click a sample directly */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          background: 'rgba(11, 13, 22, 0.92)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: '10px 18px',
          borderRadius: '9999px',
          boxShadow: '0 10px 35px rgba(0,0,0,0.8)',
          zIndex: 10,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          Or select target:
        </span>
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => onSnipComplete(sc)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.78rem',
              padding: '6px 12px',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {sc.title.split(' ')[0]} {sc.title.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Selection Box */}
      {isDragging && <div className="snip-selection-rect" style={getSelectionStyles()} />}
    </div>
  );
};
