export type VerdictType = 'Safe' | 'Suspicious' | 'Dangerous';

// Only QR code and Text inputs are accepted; URL is used strictly for links extracted from QR/text
export type ItemKind = 'qr' | 'text' | 'url';

export interface ScanFlag {
  label: string;
  detail: string;
}

export interface ScanItem {
  id: string;
  kind: ItemKind;
  value: string;
  verdict: VerdictType;
  score: number;
  flags: ScanFlag[];
  explanation?: string;
}

export interface ScanResult {
  scan_id: string;
  timestamp: string;
  overall: {
    verdict: VerdictType;
    score: number;
  };
  partial: boolean;
  latency_ms: number;
  items: ScanItem[];
  explanation: string;
  recommendedAction: string;
}
