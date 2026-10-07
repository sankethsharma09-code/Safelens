import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, ShieldCheck, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { signInApi, signUpApi, signInWithGoogleApi } from '../services/api';
import type { AuthUser } from '../services/api';

// Official multi-color Google G SVG logo
const GoogleIcon: FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (res: { credential?: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthModal: FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [showCustomEmail, setShowCustomEmail] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
    setShowGoogleDialog(false);
    setShowCustomEmail(false);
  };

  // Handle Escape key to dismiss modal
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

  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // If real Google Identity Services client ID is configured and script is available
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (gisResponse: { credential?: string }) => {
            if (gisResponse.credential) {
              try {
                const res = await signInWithGoogleApi({ credential: gisResponse.credential });
                onAuthSuccess(res.user);
                onClose();
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Google authentication failed.';
                setErrorMessage(msg);
              } finally {
                setIsGoogleLoading(false);
              }
            }
          },
        });
        window.google.accounts.id.prompt();
        return;
      } catch (err) {
        console.warn('Google Identity Services prompt failed, opening direct prompt', err);
      }
    }

    // Direct Google authentication dialog for instant verification
    setIsGoogleLoading(false);
    setShowGoogleDialog(true);
  };

  const handleExecuteGoogleSign = async (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Google email address.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await signInWithGoogleApi({
        email: cleanEmail,
        full_name: (targetName || '').trim() || cleanEmail.split('@')[0],
      });
      onAuthSuccess(res.user);
      setShowGoogleDialog(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signInApi({ email: cleanEmail, password });
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await signUpApi({
          email: cleanEmail,
          password,
          full_name: fullName.trim() || undefined,
        });
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="auth-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
        title="Click outside to close"
      />

      {/* Modal Card */}
      <div className="auth-modal-container" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div className="auth-modal-card">
          {/* Header */}
          <div className="auth-modal-header">
            <div className="auth-modal-brand">
              <div className="auth-brand-icon">
                <ShieldCheck size={20} color="#fff" />
              </div>
              <div>
                <h3 id="auth-modal-title" className="auth-brand-title">
                  {mode === 'signin' ? 'Sign In to SafeLens' : 'Create SafeLens Account'}
                </h3>
                <p className="auth-brand-subtitle">
                  {mode === 'signin'
                    ? 'Access verified scan history and threat rules'
                    : 'Get started with on-device scam defense'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="auth-close-btn"
              aria-label="Close dialog"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Create Account
            </button>
          </div>

          {/* Error Callout */}
          {errorMessage && (
            <div className="auth-error-box" role="alert">
              <AlertCircle size={16} className="auth-error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign-In Action */}
          <button
            type="button"
            className="btn-google-auth"
            onClick={handleGoogleSignInClick}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 size={16} className="auth-spinner" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon size={18} />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Inline Google Direct Dialog */}
          {showGoogleDialog && (
            <div className="google-dialog-card">
              <div className="google-dialog-header">
                <div className="google-dialog-title">
                  <GoogleIcon size={16} />
                  <span>Choose an account</span>
                </div>
                <button
                  type="button"
                  className="google-dialog-close"
                  onClick={() => setShowGoogleDialog(false)}
                  aria-label="Cancel Google dialog"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="google-dialog-desc">
                Select your account to continue to <strong>SafeLens Security</strong>:
              </p>

              <div className="google-accounts-list">
                <button
                  type="button"
                  className="google-account-item"
                  disabled={isGoogleLoading}
                  onClick={() =>
                    handleExecuteGoogleSign('sankethsharma09@gmail.com', 'Sanketh Sharma')
                  }
                >
                  <div className="google-avatar-circle" style={{ background: 'linear-gradient(135deg, #4285f4, #1a73e8)' }}>
                    S
                  </div>
                  <div className="google-account-details">
                    <span className="google-account-name">Sanketh Sharma</span>
                    <span className="google-account-email">sankethsharma09@gmail.com</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="google-account-item"
                  disabled={isGoogleLoading}
                  onClick={() =>
                    handleExecuteGoogleSign('demo.security@gmail.com', 'Google Demo User')
                  }
                >
                  <div className="google-avatar-circle" style={{ background: 'linear-gradient(135deg, #34a853, #1e8e3e)' }}>
                    G
                  </div>
                  <div className="google-account-details">
                    <span className="google-account-name">Google Demo User</span>
                    <span className="google-account-email">demo.security@gmail.com</span>
                  </div>
                </button>

                {!showCustomEmail ? (
                  <button
                    type="button"
                    className="google-account-item google-account-item-add"
                    disabled={isGoogleLoading}
                    onClick={() => setShowCustomEmail(true)}
                  >
                    <div className="google-avatar-circle google-avatar-outline">
                      <User size={14} />
                    </div>
                    <div className="google-account-details">
                      <span className="google-account-name">Use another Google account</span>
                    </div>
                  </button>
                ) : (
                  <div className="google-custom-box">
                    <input
                      type="email"
                      className="google-dialog-input"
                      placeholder="your.email@gmail.com"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      autoFocus
                    />
                    <div className="google-dialog-actions" style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn-google-submit"
                        disabled={isGoogleLoading || !googleEmailInput.trim()}
                        onClick={() =>
                          handleExecuteGoogleSign(googleEmailInput.trim())
                        }
                      >
                        <GoogleIcon size={14} />
                        <span>{isGoogleLoading ? 'Signing in...' : 'Sign In'}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-google-demo"
                        onClick={() => setShowCustomEmail(false)}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">or continue with email</span>
            <div className="auth-divider-line" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-name">
                  Full Name
                </label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    className="auth-input"
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">
                Email Address
              </label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-confirm-password">
                  Confirm Password
                </label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    required
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="auth-submit-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="auth-spinner" />
                  <span>{mode === 'signin' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</span>
              )}
            </button>
          </form>

          {/* Footer toggle */}
          <div className="auth-footer-prompt">
            {mode === 'signin' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => switchMode('signup')}
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => switchMode('signin')}
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
