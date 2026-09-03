```tsx
import { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Layers,
  FileBarChart,
} from 'lucide-react';

import {
  loginWithPassword,
  sendOtp,
  verifyOtpLogin,
  verifyOtpReset,
  resetPassword,
} from '@/lib/authApi';

import { useAuth } from '@/lib/AuthContext';

const COMPANY_NAME = 'Sakshi Laminates';
const MODULE_NAME = 'Material Requirement Tool';
const FINVERSE_URL = 'https://finversepartners.com/';

type Mode =
  | 'password'
  | 'otp-request'
  | 'otp-verify'
  | 'forgot-request'
  | 'forgot-verify'
  | 'forgot-reset';

export function LoginScreen() {
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>('password');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const [resendTimer, setResendTimer] = useState(0);

  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;

    const timer = setTimeout(
      () => setResendTimer((s) => s - 1),
      1000
    );

    return () => clearTimeout(timer);
  }, [resendTimer]);

  const clearMessages = () => {
    setError('');
    setInfo('');
  };

  const changeMode = (nextMode: Mode) => {
    clearMessages();
    setOtp('');
    setDevOtp(null);
    setMode(nextMode);
  };

  const handlePasswordLogin = async () => {
    clearMessages();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier || !password) {
      setError(
        'Please enter your User ID/Email and Password.'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { user } = await loginWithPassword(
        cleanIdentifier,
        password
      );

      await signIn(user);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Login failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (
    purpose: 'login' | 'reset'
  ) => {
    clearMessages();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError('Please enter your User ID/Email.');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const res = await sendOtp(
        cleanIdentifier,
        purpose
      );

      setInfo(res.message);

      if (res.otp) {
        setDevOtp(res.otp);
      }

      setResendTimer(60);

      if (purpose === 'login') {
        setMode('otp-verify');
      } else {
        setResetEmail(res.email);
        setMode('forgot-verify');
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Failed to send OTP.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async () => {
    clearMessages();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError('Please enter your User ID/Email.');
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { user } = await verifyOtpLogin(
        cleanIdentifier,
        otp
      );

      await signIn(user);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'OTP verification failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpReset = async () => {
    clearMessages();

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError('Please enter your User ID/Email.');
      return;
    }

    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const res = await verifyOtpReset(
        cleanIdentifier,
        otp
      );

      setResetToken(res.reset_token);
      setOtp('');
      setInfo('');
      setMode('forgot-reset');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'OTP verification failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();

    if (!newPassword || !confirmPassword) {
      setError(
        'Please enter and confirm your new password.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordIsValid =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /\d/.test(newPassword) &&
      /[^A-Za-z0-9]/.test(newPassword);

    if (!passwordIsValid) {
      setError(
        'Password must be at least 8 characters with uppercase, lowercase, digit, and special character.'
      );
      return;
    }

    if (!resetToken) {
      setError(
        'Password reset session has expired. Please request a new OTP.'
      );
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      await resetPassword(
        resetToken,
        newPassword
      );

      setMode('password');

      setInfo(
        'Password reset successfully. Please login with your new password.'
      );

      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setIdentifier('');
      setPassword('');
      setResetToken('');
      setResetEmail('');
      setShowNewPassword(false);
      setShowPassword(false);
      setResendTimer(0);
      setDevOtp(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Password reset failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, string> = {
    password: 'Sign In',
    'otp-request': 'Login with OTP',
    'otp-verify': 'Verify OTP',
    'forgot-request': 'Forgot Password',
    'forgot-verify': 'Verify OTP',
    'forgot-reset': 'Set New Password',
  };

  const subtitles: Record<Mode, string> = {
    password:
      'Enter your credentials to access the panel',
    'otp-request':
      'Enter your User ID/Email to receive an OTP',
    'otp-verify':
      'Enter the 6-digit code sent to your email',
    'forgot-request':
      'Enter your User ID/Email to receive a reset OTP',
    'forgot-verify':
      'Enter the 6-digit code sent to your email',
    'forgot-reset':
      'Create a new password for your account',
  };

  const inputBase =
    'w-full pl-11 pr-4 py-3 bg-[#F9FAFB] border border-[var(--color-border-base)] rounded-xl text-sm text-[var(--color-text-primary)] ' +
    'placeholder:text-[var(--color-text-secondary)]/50 ' +
    'hover:border-[var(--color-primary)]/40 focus:border-[var(--color-primary)] focus:bg-white ' +
    'focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none transition-all duration-200';

  const btnPrimary =
    'w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary)] ' +
    'hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed ' +
    'text-white rounded-xl text-sm font-semibold transition-all duration-200 ' +
    'shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-xl hover:shadow-[var(--color-primary)]/25 ' +
    'active:scale-[0.98]';

  const linkBtn =
    'text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium transition';

  const backBtn =
    'inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] ' +
    'font-medium transition group';

  const labelClass =
    'block text-xs font-semibold text-[var(--color-text-secondary)] tracking-wide mb-2';

  const otpInputClass =
    'w-full px-4 py-4 bg-[#F9FAFB] border border-[var(--color-border-base)] rounded-xl ' +
    'text-center text-3xl font-bold tracking-[0.6em] placeholder:tracking-[0.3em] ' +
    'placeholder:text-[var(--color-text-secondary)]/30 text-[var(--color-primary)] ' +
    'hover:border-[var(--color-primary)]/40 focus:border-[var(--color-primary)] focus:bg-white ' +
    'focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none transition-all duration-200';

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full flex bg-white overflow-hidden">

      {/* =====================================================
          LEFT BRAND PANEL - DESKTOP ONLY
      ===================================================== */}

      <div className="hidden lg:flex w-[45%] xl:w-[42%] relative overflow-hidden bg-[var(--color-primary)]">

        {/* Decorative gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">

          <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-white/[0.07] blur-3xl animate-floatOrb" />

          <div className="absolute bottom-0 -right-12 w-80 h-80 rounded-full bg-[var(--color-primary-hover)]/40 blur-3xl animate-floatOrb2" />

          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/[0.04] blur-2xl" />

        </div>

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 text-white w-full">

          {/* Desktop Company */}
          <div className="flex items-center">

            <h1 className="text-lg font-bold leading-tight">
              {COMPANY_NAME}
            </h1>

          </div>

          {/* Hero */}
          <div className="space-y-6 max-w-md">

            <h1 className="text-3xl xl:text-[2.5rem] font-bold leading-[1.15]">
              Bill of Material
              <br />
              Management Portal
            </h1>

            <p className="text-white/55 text-sm leading-relaxed">
              Calculate material requirements, manage BOM files, and track consumption.
            </p>

            <div className="space-y-3 pt-3">

              {[
                {
                  icon: Layers,
                  text: 'Multi-level BOM calculation',
                },
                {
                  icon: ShieldCheck,
                  text: 'Secure login with password & OTP',
                },
                {
                  icon: FileBarChart,
                  text: 'Complete audit trail of all activities',
                },
              ].map((feature, index) => {

                const Icon = feature.icon;

                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-sm text-white/65"
                  >

                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">

                      <Icon
                        size={15}
                        className="text-white/75"
                      />

                    </div>

                    <span>{feature.text}</span>

                  </div>
                );
              })}

            </div>

          </div>

          {/* Desktop Footer */}
          <div className="flex items-center gap-2 text-xs text-white/40">

            <span>Powered by</span>

            <a
              href={FINVERSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white/60 hover:text-white transition"
            >
              Finverse
            </a>

          </div>

        </div>

      </div>

      {/* =====================================================
          RIGHT FORM PANEL
      ===================================================== */}

      <div className="flex-1 min-w-0 h-full flex flex-col bg-[#FAFAFA] overflow-hidden">

        {/* =================================================
            FORM AREA
        ================================================= */}

        <div className="flex-1 min-h-0 flex items-center justify-center px-4 py-4 sm:p-8 lg:p-10 overflow-hidden">

          <div className="w-full max-w-[420px]">

            {/* =================================================
                MAIN LOGO + COMPANY + MODULE
            ================================================= */}

            <div className="flex flex-col items-center mb-5 sm:mb-7">

              {/* Logo - NO background, NO border */}
              <div
                className="shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  width: '56px',
                  height: '56px',
                }}
              >

                <img
                  src="/sllogo.jpeg"
                  alt={COMPANY_NAME}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />

              </div>

              {/* Company Name */}
              <h1 className="text-base sm:text-lg font-bold text-[var(--color-primary)] mt-2">
                {COMPANY_NAME}
              </h1>

              {/* Module Name */}
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5">
                {MODULE_NAME}
              </p>

            </div>

            {/* Title */}
            <div className="mb-5 sm:mb-6">

              <h2 className="text-[1.35rem] sm:text-[1.5rem] font-bold text-[var(--color-text-primary)] leading-tight">
                {titles[mode]}
              </h2>

              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed">
                {subtitles[mode]}
              </p>

            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 sm:mb-4 flex items-start gap-2.5 text-xs sm:text-sm text-[var(--color-error)] bg-red-50 border border-red-200/70 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 animate-fadeIn">

                <AlertCircle
                  size={16}
                  className="shrink-0 mt-0.5"
                />

                <span className="flex-1 min-w-0">
                  {error}
                </span>

              </div>
            )}

            {/* Info */}
            {info && (
              <div className="mb-3 sm:mb-4 flex items-start gap-2.5 text-xs sm:text-sm text-[var(--color-success)] bg-green-50 border border-green-200/70 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 animate-fadeIn">

                <CheckCircle2
                  size={16}
                  className="shrink-0 mt-0.5"
                />

                <span className="flex-1 min-w-0">
                  {info}
                </span>

              </div>
            )}

            {/* Demo OTP */}
            {devOtp && (
              <div className="mb-3 sm:mb-4 flex items-start gap-2.5 text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200/70 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 animate-fadeIn">

                <Mail
                  size={16}
                  className="shrink-0 mt-0.5"
                />

                <span className="flex-1 min-w-0">

                  <strong>
                    Demo OTP: {devOtp}
                  </strong>{' '}

                  — email delivery not configured

                </span>

              </div>
            )}

            {/* =================================================
                PASSWORD LOGIN
            ================================================= */}

            {mode === 'password' && (
              <div
                key="password-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                {/* User ID */}
                <div>

                  <label className={labelClass}>
                    User ID / Registered Email
                  </label>

                  <div className="relative">

                    <User
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError('');
                        setInfo('');
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        !loading &&
                        handlePasswordLogin()
                      }
                      placeholder="Enter User ID or Email..."
                      className={inputBase}
                      autoFocus
                      autoComplete="username"
                    />

                  </div>

                </div>

                {/* Password */}
                <div>

                  <label className={labelClass}>
                    Password
                  </label>

                  <div className="relative">

                    <Lock
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
                      }
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                        setInfo('');
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        !loading &&
                        handlePasswordLogin()
                      }
                      placeholder="Enter password..."
                      className={`${inputBase} pr-11`}
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((v) => !v)
                      }
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition"
                    >

                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}

                    </button>

                  </div>

                </div>

                {/* Sign In */}
                <button
                  type="button"
                  onClick={handlePasswordLogin}
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>Sign In</>
                  )}

                </button>

                {/* Links */}
                <div className="flex items-center justify-between pt-0.5">

                  <button
                    type="button"
                    onClick={() =>
                      changeMode('otp-request')
                    }
                    className={linkBtn}
                  >
                    Login with OTP
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeMode('forgot-request')
                    }
                    className={linkBtn}
                  >
                    Forgot Password?
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                OTP REQUEST
            ================================================= */}

            {mode === 'otp-request' && (
              <div
                key="otp-request-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                <div>

                  <label className={labelClass}>
                    User ID / Registered Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError('');
                        setInfo('');
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        !loading &&
                        handleSendOtp('login')
                      }
                      placeholder="Enter User ID or Email..."
                      className={inputBase}
                      autoFocus
                      autoComplete="username"
                    />

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSendOtp('login')
                  }
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>Send OTP</>
                  )}

                </button>

                <div className="pt-0.5">

                  <button
                    type="button"
                    onClick={() =>
                      changeMode('password')
                    }
                    className={backBtn}
                  >

                    <ArrowLeft
                      size={14}
                      className="transition group-hover:-translate-x-0.5"
                    />

                    Back to Password Login

                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                OTP VERIFY LOGIN
            ================================================= */}

            {mode === 'otp-verify' && (
              <div
                key="otp-verify-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                <div>

                  <label className={labelClass}>
                    Enter OTP
                  </label>

                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      );
                      setError('');
                    }}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      !loading &&
                      handleVerifyOtpLogin()
                    }
                    placeholder="• • • • • •"
                    inputMode="numeric"
                    maxLength={6}
                    className={otpInputClass}
                    autoFocus
                    autoComplete="one-time-code"
                  />

                  <p className="text-xs text-[var(--color-text-secondary)] mt-2 text-center leading-relaxed">
                    A 6-digit code was sent to your registered email
                  </p>

                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtpLogin}
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>
                      Verify &amp; Login
                      <CheckCircle2 size={16} />
                    </>
                  )}

                </button>

                <div className="flex items-center justify-between pt-0.5">

                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setOtp('');
                      setDevOtp(null);
                      setMode('password');
                    }}
                    className={backBtn}
                  >

                    <ArrowLeft
                      size={14}
                      className="transition group-hover:-translate-x-0.5"
                    />

                    Back

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        resendTimer === 0 &&
                        !loading
                      ) {
                        handleSendOtp('login');
                      }
                    }}
                    disabled={
                      resendTimer > 0 || loading
                    }
                    className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : 'Resend OTP'}

                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                FORGOT PASSWORD REQUEST
            ================================================= */}

            {mode === 'forgot-request' && (
              <div
                key="forgot-request-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                <div>

                  <label className={labelClass}>
                    User ID / Registered Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError('');
                        setInfo('');
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        !loading &&
                        handleSendOtp('reset')
                      }
                      placeholder="Enter User ID or Email..."
                      className={inputBase}
                      autoFocus
                      autoComplete="username"
                    />

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleSendOtp('reset')
                  }
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>Send Reset OTP</>
                  )}

                </button>

                <div className="pt-0.5">

                  <button
                    type="button"
                    onClick={() =>
                      changeMode('password')
                    }
                    className={backBtn}
                  >

                    <ArrowLeft
                      size={14}
                      className="transition group-hover:-translate-x-0.5"
                    />

                    Back to Login

                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                FORGOT PASSWORD VERIFY
            ================================================= */}

            {mode === 'forgot-verify' && (
              <div
                key="forgot-verify-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                {resetEmail && (
                  <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] text-center bg-[var(--color-primary-light)] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 leading-relaxed">

                    OTP sent to{' '}

                    <strong className="text-[var(--color-primary)] break-all">
                      {resetEmail}
                    </strong>

                  </p>
                )}

                <div>

                  <label className={labelClass}>
                    Enter OTP
                  </label>

                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => {
                      setOtp(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6)
                      );
                      setError('');
                    }}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      !loading &&
                      handleVerifyOtpReset()
                    }
                    placeholder="• • • • • •"
                    inputMode="numeric"
                    maxLength={6}
                    className={otpInputClass}
                    autoFocus
                    autoComplete="one-time-code"
                  />

                </div>

                <button
                  type="button"
                  onClick={handleVerifyOtpReset}
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>Verify OTP</>
                  )}

                </button>

                <div className="flex items-center justify-between pt-0.5">

                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setOtp('');
                      setDevOtp(null);
                      setMode('forgot-request');
                    }}
                    className={backBtn}
                  >

                    <ArrowLeft
                      size={14}
                      className="transition group-hover:-translate-x-0.5"
                    />

                    Back

                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        resendTimer === 0 &&
                        !loading
                      ) {
                        handleSendOtp('reset');
                      }
                    }}
                    disabled={
                      resendTimer > 0 || loading
                    }
                    className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    {resendTimer > 0
                      ? `Resend in ${resendTimer}s`
                      : 'Resend OTP'}

                  </button>

                </div>

              </div>
            )}

            {/* =================================================
                RESET PASSWORD
            ================================================= */}

            {mode === 'forgot-reset' && (
              <div
                key="forgot-reset-form"
                className="space-y-3.5 sm:space-y-4 animate-slideInRight"
              >

                <div>

                  <label className={labelClass}>
                    New Password
                  </label>

                  <div className="relative">

                    <KeyRound
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type={
                        showNewPassword
                          ? 'text'
                          : 'password'
                      }
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter new password..."
                      className={`${inputBase} pr-11`}
                      autoFocus
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword(
                          (v) => !v
                        )
                      }
                      aria-label={
                        showNewPassword
                          ? 'Hide new password'
                          : 'Show new password'
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition"
                    >

                      {showNewPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}

                    </button>

                  </div>

                  <p className="text-[11px] sm:text-xs text-[var(--color-text-secondary)] mt-2 ml-1 leading-relaxed">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
                  </p>

                </div>

                <div>

                  <label className={labelClass}>
                    Confirm New Password
                  </label>

                  <div className="relative">

                    <KeyRound
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                    />

                    <input
                      type={
                        showNewPassword
                          ? 'text'
                          : 'password'
                      }
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(
                          e.target.value
                        );
                        setError('');
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        !loading &&
                        handleResetPassword()
                      }
                      placeholder="Confirm new password..."
                      className={inputBase}
                      autoComplete="new-password"
                    />

                  </div>

                </div>

                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className={btnPrimary}
                >

                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <>
                      Reset Password
                      <CheckCircle2 size={16} />
                    </>
                  )}

                </button>

              </div>
            )}

            {/* =================================================
                MOBILE FOOTER
            ================================================= */}

            <div className="lg:hidden flex items-center justify-center gap-2 mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-[var(--color-border-base)]">

              <span className="text-[11px] sm:text-xs text-[var(--color-text-secondary)]">
                Powered by
              </span>

              <a
                href={FINVERSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] sm:text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition"
              >
                Finverse
              </a>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
```
