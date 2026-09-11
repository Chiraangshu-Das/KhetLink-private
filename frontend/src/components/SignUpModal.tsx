'use client';

import { useState } from 'react';
import { User2Icon, Mail, Phone, Lock, Eye, EyeOff, X, ChevronDown } from 'lucide-react';
import './SignupModal.css';

interface SignupModalProps {
  onClose: () => void;
  onLogin?: () => void;
  onSuccess?: (user: { firstName?: string; lastName?: string; profileImage?: string }) => void;
}

interface FieldErrors {
  firstName?: string[];
  lastName?: string[];
  email?: string[];
  phone?: string[];
  password?: string[];
  confirmPassword?: string[];
}

export default function SignupModal({
  onClose,
  onLogin,
  onSuccess,
}: SignupModalProps) {

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    profileImage: '',
    password: '',
    confirmPassword: '',
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, phone: `${form.countryCode}${form.phone}` }),
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

      // Stay on the landing page after signup and update its auth controls.
      onSuccess?.(data.user ?? {});
      onClose();
    } catch {
      setGlobalError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="signup-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >

      <div className="signup-modal">

        {/* CLOSE BUTTON */}

        <button
          type="button"
          className="signup-close"
          onClick={onClose}
          aria-label="Close sign up"
        >
          <X size={19} strokeWidth={2} />
        </button>


        {/* DECORATIVE LEAF */}

        <div className="signup-decoration signup-decoration-top">
          <span />
        </div>


        {/* LOGO */}

        <div className="signup-logo">

          <img
            src="/KhetLink_Logo.svg"
            alt="KhetLink Logo"
          />

        </div>


        {/* HEADER */}

        <div className="signup-header">

          <h2>Create Account</h2>

          <p>
            Sign up to get started with KhetLink
          </p>

        </div>


        {/* GLOBAL ERROR */}

        {globalError && (
          <p style={{ color: '#dc2626', fontSize: '0.82rem', textAlign: 'center', marginBottom: '0.5rem' }}>
            {globalError}
          </p>
        )}


        {/* FORM */}

        <form className="signup-form" onSubmit={handleSubmit}>

          {/* FIRST NAME + LAST NAME */}

          <div style={{ display: 'flex', gap: '0.6rem' }}>

            <div style={{ flex: 1 }}>
              <div className="signup-input-wrapper">
                <User2Icon
                  className="signup-input-icon"
                  size={20}
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  autoComplete="given-name"
                  required
                  value={form.firstName}
                  onChange={set('firstName')}
                />
              </div>
              {fieldErrors.firstName && (
                <p className="signup-field-error">{fieldErrors.firstName[0]}</p>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div className="signup-input-wrapper">
                <User2Icon
                  className="signup-input-icon"
                  size={20}
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  autoComplete="family-name"
                  required
                  value={form.lastName}
                  onChange={set('lastName')}
                />
              </div>
              {fieldErrors.lastName && (
                <p className="signup-field-error">{fieldErrors.lastName[0]}</p>
              )}
            </div>

          </div>


          {/* EMAIL */}

          <div className="signup-input-wrapper">

            <Mail
              className="signup-input-icon"
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
            <p className="signup-field-error">{fieldErrors.email[0]}</p>
          )}


          {/* PHONE NUMBER */}

          <div className="signup-input-wrapper">
            <Phone className="signup-input-icon" size={20} strokeWidth={1.8} />
            <select name="countryCode" value={form.countryCode} onChange={(e) => setForm((prev) => ({ ...prev, countryCode: e.target.value }))} aria-label="Country code" style={{ border: 0, background: 'transparent', fontWeight: 600, outline: 0, width: 74 }}>
              <option value="+91">🇮🇳 +91</option><option value="+1">🇺🇸 +1</option><option value="+44">🇬🇧 +44</option><option value="+971">🇦🇪 +971</option><option value="+61">🇦🇺 +61</option>
            </select>
            <input type="tel" name="phone" placeholder="Phone Number" autoComplete="tel-national" required value={form.phone} onChange={set('phone')} />
          </div>
          {fieldErrors.phone && (
            <p className="signup-field-error">{fieldErrors.phone[0]}</p>
          )}


          {/* PROFILE IMAGE */}
          <div className="signup-input-wrapper">
            <input type="file" accept="image/*" aria-label="Profile image" onChange={(e) => { const file=e.target.files?.[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>setForm((prev)=>({...prev,profileImage:String(reader.result)})); reader.readAsDataURL(file); }} />
          </div>

          {/* PASSWORD */}

          <div className="signup-input-wrapper">

            <Lock
              className="signup-input-icon"
              size={20}
              strokeWidth={1.8}
            />

            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={set('password')}
            />

            <button
              type="button"
              className="signup-password-toggle"
              onClick={() =>
                setShowPassword((previous) => !previous)
              }
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
            <p className="signup-field-error">{fieldErrors.password[0]}</p>
          )}


          {/* CONFIRM PASSWORD */}

          <div className="signup-input-wrapper">

            <Lock
              className="signup-input-icon"
              size={20}
              strokeWidth={1.8}
            />

            <input
              type={
                showConfirmPassword
                  ? 'text'
                  : 'password'
              }
              name="confirmPassword"
              placeholder="Confirm Password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
            />

            <button
              type="button"
              className="signup-password-toggle"
              onClick={() =>
                setShowConfirmPassword(
                  (previous) => !previous
                )
              }
              aria-label={
                showConfirmPassword
                  ? 'Hide confirm password'
                  : 'Show confirm password'
              }
            >

              {showConfirmPassword ? (
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
          {fieldErrors.confirmPassword && (
            <p className="signup-field-error">{fieldErrors.confirmPassword[0]}</p>
          )}


          {/* SIGN UP BUTTON */}

          <button
            type="submit"
            className="signup-submit"
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>

        </form>


        {/* DIVIDER */}

        <div className="signup-divider">

          <span />

          <p>or</p>

          <span />

        </div>


        {/* LOGIN */}

        <div className="signup-login">

          <span>
            Already have an account?
          </span>

          <button
            type="button"
            className="signup-login-link"
            onClick={onLogin}
          >
            Login
          </button>

        </div>


        {/* BOTTOM LANDSCAPE */}
        <div className="signup-landscape"></div>
      </div>

    </div>
  );
}