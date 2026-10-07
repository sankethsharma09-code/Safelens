import { useState } from 'react';
import type { FC } from 'react';
import { ShieldAlert, Sun, Moon, Zap, LogIn, LogOut, Menu, X } from 'lucide-react';
import type { AuthUser } from '../services/api';

interface NavbarProps {
  onOpenSnip: () => void;
  onOpenPanel: () => void;
  onNavigateHome?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: FC<NavbarProps> = ({
  onOpenSnip,
  onOpenPanel,
  onNavigateHome,
  theme,
  onToggleTheme,
  user,
  onOpenAuth,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="nav-header">
      {/* Brand logo */}
      <a
        href="#"
        className="nav-brand"
        onClick={(e) => {
          e.preventDefault();
          onNavigateHome?.();
        }}
      >
        <div className="nav-brand-icon">
          <ShieldAlert size={20} color="#fff" />
        </div>
        <span>SafeLens</span>
      </a>

      {/* Center Nav Links */}
      <ul className="nav-links">
        <li>
          <a
            href="#home"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome?.();
            }}
          >
            Home
          </a>
        </li>
        <li>
          <a
            href="#pipeline"
            className="nav-link"
            onClick={() => {
              onNavigateHome?.();
            }}
          >
            How It Works
          </a>
        </li>
        <li>
          <a
            href="#sandbox"
            className="nav-link"
            onClick={() => {
              onNavigateHome?.();
            }}
          >
            Test Scenarios
          </a>
        </li>
        <li>
          <button
            onClick={onOpenPanel}
            className="nav-link"
            style={{ background: 'none', border: 'none', font: 'inherit' }}
          >
            Desktop Panel
          </button>
        </li>
      </ul>

      {/* Right Side: Auth, Color Mode Switch & Pill Button */}
      <div className="nav-actions">
        {/* User Authentication Status */}
        {user ? (
          <div className="nav-user-chip" title={`Signed in as ${user.email}`}>
            <div className="nav-user-avatar">
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <span className="nav-user-name">
              {user.full_name || user.email.split('@')[0]}
            </span>
            <button
              className="nav-logout-btn"
              onClick={onLogout}
              title="Sign Out of SafeLens"
              aria-label="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            className="btn-nav-auth"
            onClick={onOpenAuth}
            title="Sign in or create an account"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}

        {/* Color Mode Switch (Dark / Light) */}
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Color Mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun size={15} color="#fbbf24" />
              <span className="theme-toggle-text">Light</span>
            </>
          ) : (
            <>
              <Moon size={15} color="#7e22ce" />
              <span className="theme-toggle-text">Dark</span>
            </>
          )}
        </button>

        {/* Purple Pill Button */}
        <button className="btn-pill-purple" onClick={onOpenSnip}>
          <Zap size={14} />
          <span className="btn-pill-text">Launch Snip</span>
        </button>

        {/* Mobile Hamburger Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          title="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-dropdown-menu">
          <a
            href="#home"
            className="mobile-nav-link"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileMenuOpen(false);
              onNavigateHome?.();
            }}
          >
            Home
          </a>
          <a
            href="#pipeline"
            className="mobile-nav-link"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateHome?.();
            }}
          >
            How It Works
          </a>
          <a
            href="#sandbox"
            className="mobile-nav-link"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onNavigateHome?.();
            }}
          >
            Test Scenarios
          </a>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenPanel();
            }}
            className="mobile-nav-link mobile-nav-btn"
          >
            Desktop Panel
          </button>
        </div>
      )}
    </header>
  );
};
