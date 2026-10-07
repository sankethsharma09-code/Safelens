import type { ScanResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ScanItemPayload {
  kind: 'qr' | 'text';
  value: string;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitScan(items: ScanItemPayload[]): Promise<ScanResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      items,
      context: { language: 'en' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody.error ||
      errorBody.detail ||
      `Backend returned error HTTP ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return (await response.json()) as ScanResult;
}
