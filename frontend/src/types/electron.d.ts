export interface DisplayMetadata {
  id: number | string;
  bounds: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
  size: { width: number; height: number };
}

export interface DisplayCapturePayload {
  dataUrl: string;
  display: DisplayMetadata;
}

export interface SnipCompletedPayload {
  croppedDataUrl: string | null;
  rect: { x: number; y: number; width: number; height: number };
  pixelBounds: { x: number; y: number; width: number; height: number };
  display?: DisplayMetadata;
}

export interface ElectronAPI {
  isElectron: boolean;
  onDisplayCapture: (callback: (payload: DisplayCapturePayload) => void) => () => void;
  cancelSnip: () => void;
  sendCroppedRegion: (payload: {
    rect: { x: number; y: number; width: number; height: number };
    display?: DisplayMetadata;
  }) => void;
  onSnipCompleted: (callback: (payload: SnipCompletedPayload) => void) => () => void;
  triggerSnip: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
