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
} from '@/lib/authApi';

import { useAuth } from '@/lib/AuthContext';

const COMPANY_NAME = 'Sakshi Laminates';
const MODULE_NAME = 'Material Requirement Tool';
const FINVERSE_URL = 'https://finversepartners.com/';

type Mode = 'password';

export function LoginScreen() {
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>('password');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const clearMessages = () => {
    setError('');
    setInfo('');
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

  const titles: Record<Mode, string> = {
    password: 'Sign In',
  };

  const subtitles: Record<Mode, string> = {
    password:
      'Enter your credentials to access the panel',
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

  const labelClass =
    'block text-xs font-semibold text-[var(--color-text-secondary)] tracking-wide mb-2';

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full flex bg-white overflow-hidden">

      {/* =====================================================
          LEFT BRAND PANEL
          DESKTOP ONLY
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

          {/* Desktop Company Name */}
          <div className="flex items-center gap-2.5">

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
                  text: 'Secure login with password',
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

                    <span>
                      {feature.text}
                    </span>

                  </div>
                );
              })}

            </div>
          </div>

          {/* Powered by */}
          <div className="flex items-center gap-2 text-xs text-white/40">

            <span>
              Powered by
            </span>

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

      <div className="flex-1 h-[100dvh] min-h-0 flex flex-col bg-[#FAFAFA] overflow-hidden">

        {/* Form Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">

          <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col px-5 py-5 sm:px-10 sm:py-10">

            {/* =================================================
                MAIN FORM LOGO
            ================================================= */}

            <div className="flex flex-col items-center mb-5 sm:mb-7">

              <div
                className="shrink-0 flex items-center justify-center overflow-hidden"
                style={{
                  width: '60px',
                  height: '60px',
                  padding: '6px',
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

              <h1 className="text-lg font-bold text-[var(--color-primary)] mt-2">
                {COMPANY_NAME}
              </h1>

              {/* Mobile Module Name */}
              <p className="lg:hidden text-xs text-[var(--color-text-secondary)] mt-0.5">
                {MODULE_NAME}
              </p>

            </div>

            {/* Title */}
            <div className="mb-5 sm:mb-6">

              <h2 className="text-[1.4rem] sm:text-[1.5rem] font-bold text-[var(--color-text-primary)] leading-tight">
                {titles[mode]}
              </h2>

              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {subtitles[mode]}
              </p>

            </div>

            {/* Error */}
            {error && (
              <div className="mb-3.5 flex items-start gap-2.5 text-sm text-[var(--color-error)] bg-red-50 border border-red-200/70 rounded-xl px-4 py-3 animate-fadeIn">

                <AlertCircle
                  size={17}
                  className="shrink-0 mt-0.5"
                />

                <span className="flex-1">
                  {error}
                </span>

              </div>
            )}

            {/* Info */}
            {info && (
              <div className="mb-3.5 flex items-start gap-2.5 text-sm text-[var(--color-success)] bg-green-50 border border-green-200/70 rounded-xl px-4 py-3 animate-fadeIn">

                <CheckCircle2
                  size={17}
                  className="shrink-0 mt-0.5"
                />

                <span className="flex-1">
                  {info}
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

              </div>
            )}

            {/* =================================================
                MOBILE FOOTER
                STAYS AT BOTTOM
            ================================================= */}

            <div className="lg:hidden mt-auto pt-5 flex items-center justify-center gap-2">

              <span className="text-xs text-[var(--color-text-secondary)]">
                Powered by
              </span>

              <a
                href={FINVERSE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition"
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
