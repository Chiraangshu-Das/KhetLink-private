'use client';

import { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

import './LoginModal.css';

interface LoginModalProps {
  onClose: () => void;
  onSignUp: () => void;
}

interface FieldErrors {
  email?: string[];
  password?: string[];
}

export default function LoginModal({ onClose, onSignUp }: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setGlobalError('');
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) {
          setFieldErrors(data.details.fieldErrors as FieldErrors);
        } else {
          setGlobalError(data.error ?? 'Something went wrong');
        }
        return;
      }

      // Success → redirect to dashboard
      window.location.href = '/dashboard';
    } catch {
      setGlobalError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="login-modal">

        {/* CLOSE BUTTON */}
        <button
          type="button"
          className="login-close"
          onClick={onClose}
          aria-label="Close login"
        >
          <X size={19} strokeWidth={2} />
        </button>


        {/* DECORATIVE LEAF */}
        <div className="login-decoration login-decoration-top">
          <span />
        </div>


        {/* LOGO */}
        <div className="login-logo">
          <img
            src="/KhetLink_Logo.svg"
            alt="KhetLink Logo"
          />
        </div>


        {/* HEADER */}
        <div className="login-header">
          <h2>Welcome Back!</h2>

          <p>
            Login to continue with KhetLink
          </p>
        </div>


        {/* GLOBAL ERROR */}
        {globalError && (
          <p style={{ color: '#dc2626', fontSize: '0.82rem', textAlign: 'center', marginBottom: '0.5rem' }}>
            {globalError}
          </p>
        )}


        {/* LOGIN FORM */}
        <form className="login-form" onSubmit={handleSubmit}>


          {/* EMAIL */}
          <div className="login-input-wrapper">

            <Mail
              className="login-input-icon"
              size={20}
              strokeWidth={1.8}
            />

            <input
              type="email"
              name="email"
              placeholder="Email ID"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
            />

          </div>
          {fieldErrors.email && (
            <p className="login-field-error">{fieldErrors.email[0]}</p>
          )}


          {/* PASSWORD */}
          <div className="login-input-wrapper">

            <Lock
              className="login-input-icon"
              size={20}
              strokeWidth={1.8}
            />

            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={set('password')}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              {showPassword ? (
                <EyeOff
                  size={19}
                  strokeWidth={1.8}
                />
              ) : (
                <Eye
                  size={19}
                  strokeWidth={1.8}
                />
              )}
            </button>

          </div>
          {fieldErrors.password && (
            <p className="login-field-error">{fieldErrors.password[0]}</p>
          )}
          {/* FORGOT PASSWORD */}
          <div className="forgot-password-row">

            <button
              type="button"
              className="forgot-password"
            >
              Forgot Password?
            </button>

          </div>


          {/* LOGIN BUTTON */}
          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>

        </form>


        {/* OR DIVIDER */}
        <div className="login-divider">

          <span />

          <p>or</p>

          <span />

        </div>


        {/* SIGN UP */}
        <div className="login-signup">

          <span>
            Don&apos;t have an account?
          </span>

          <button
            type="button"
            className="login-signup-link"
            onClick={onSignUp}
          >
            Sign Up
          </button>

        </div>


        {/* BOTTOM LANDSCAPE */}
        <div className="login-landscape"></div>
      </div>
    </div>
  );
}