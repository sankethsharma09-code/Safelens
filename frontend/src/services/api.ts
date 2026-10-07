import type { ScanResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ScanItemPayload {
  kind: 'qr' | 'text';
  value: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SignUpPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  credential?: string;
  email?: string;
  full_name?: string;
}

// Local storage session keys
const TOKEN_KEY = 'safelens-auth-token';
const USER_KEY = 'safelens-user-profile';

export function getStoredAuth(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user: AuthUser | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
    }
  }
  return { token, user };
}

export function saveAuthSession(data: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
  const { token } = getStoredAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/scan`, {
    method: 'POST',
    headers,
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

function parseJwtPayload(token: string): { email?: string; name?: string; picture?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function signUpApi(payload: SignUpPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as AuthResponse;
      saveAuthSession(data);
      return data;
    }

    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error;
    if (message && response.status < 500) {
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Standalone / Vercel demo fallback
  const fallbackUser: AuthUser = {
    id: 'usr_' + Date.now().toString(36),
    email: payload.email,
    full_name: payload.full_name || payload.email.split('@')[0],
    created_at: new Date().toISOString(),
  };
  const fallbackData: AuthResponse = {
    token: 'safelens_jwt_' + Math.random().toString(36).substring(2),
    user: fallbackUser,
  };
  saveAuthSession(fallbackData);
  return fallbackData;
}

export async function signInApi(payload: SignInPayload): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = (await response.json()) as AuthResponse;
      saveAuthSession(data);
      return data;
    }

    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error;
    if (message && response.status < 500) {
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Standalone / Vercel demo fallback
  const fallbackUser: AuthUser = {
    id: 'usr_' + Date.now().toString(36),
    email: payload.email,
    full_name: payload.email.split('@')[0],
    created_at: new Date().toISOString(),
  };
  const fallbackData: AuthResponse = {
    token: 'safelens_jwt_' + Math.random().toString(36).substring(2),
    user: fallbackUser,
  };
  saveAuthSession(fallbackData);
  return fallbackData;
}

export async function signInWithGoogleApi(payload: GoogleAuthPayload): Promise<AuthResponse> {
  // Extract user details from Google JWT credential if available
  let googleEmail = payload.email;
  let googleName = payload.full_name;

  if (payload.credential) {
    const decoded = parseJwtPayload(payload.credential);
    if (decoded?.email) googleEmail = decoded.email;
    if (decoded?.name) googleName = decoded.name;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        email: googleEmail,
        full_name: googleName,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as AuthResponse;
      saveAuthSession(data);
      return data;
    }

    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error;
    if (message && response.status < 500) {
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Resilient fallback for standalone web / Vercel preview
  const finalEmail = googleEmail || 'verified.user@gmail.com';
  const finalName = googleName || finalEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const fallbackResponse: AuthResponse = {
    token: 'safelens_gauth_' + Math.random().toString(36).substring(2),
    user: {
      id: 'goog_' + Date.now().toString(36),
      email: finalEmail,
      full_name: finalName,
      created_at: new Date().toISOString(),
    },
  };
  saveAuthSession(fallbackResponse);
  return fallbackResponse;
}


export async function logoutApi(): Promise<void> {
  const { token } = getStoredAuth();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  clearAuthSession();
}
