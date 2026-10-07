import { useState, useEffect } from 'react';
import type { FC, FormEvent } from 'react';
import { X, ShieldCheck, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { signInApi, signUpApi } from '../services/api';
import type { AuthUser } from '../services/api';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMessage(null);
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

          {/* Form */}
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
              disabled={isLoading}
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
