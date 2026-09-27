import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, ArrowRight, LogIn, UserPlus, KeyRound, RefreshCw, AlertTriangle } from 'lucide-react';
import MinimalBrandHeader from '../components/MinimalBrandHeader';
import { useTheme } from '../lib/theme';
import { api, getToken, setToken, setStoredUser } from '../api/client';
import { playClick } from '../utils/soundFx';
import { signInWithGoogle, signInWithFirebaseEmail, registerWithFirebaseEmail } from '../lib/firebase';

export default function Auth({ mode: initialMode = 'login' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dark } = useTheme();

  const [mode, setMode] = useState(initialMode); // 'login' | 'otp' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP state & Resend service
  const [otpStep, setOtpStep] = useState('request'); // 'request' | 'verify'
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const cardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(null);
  const animatingHeight = useRef(false);

  // Live countdown timer for Resend OTP service
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const switchMode = (next) => {
    if (next === mode) return;
    playClick();
    const el = cardRef.current;
    if (el) {
      animatingHeight.current = true;
      setCardHeight(el.offsetHeight);
    }
    setError(null);
    setOtpMessage(null);
    setMode(next);
  };

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !animatingHeight.current) return undefined;
    const target = el.scrollHeight;
    const frame = requestAnimationFrame(() => setCardHeight(target));
    const settle = window.setTimeout(() => {
      animatingHeight.current = false;
      setCardHeight(null);
    }, 380);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [mode, otpStep]);

  const cardStyle = useMemo(
    () =>
      cardHeight == null
        ? undefined
        : {
            height: `${cardHeight}px`,
            overflow: 'hidden',
            transition: 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          },
    [cardHeight],
  );

  if (getToken()) {
    return <Navigate to="/app" replace />;
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    playClick();

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        if (result.error.includes('unauthorized-domain') || result.code === 'auth/unauthorized-domain') {
          // Switch to Email OTP mode automatically as a seamless fallback
          switchMode('otp');
        }
        setGoogleLoading(false);
        return;
      }

      if (result.user) {
        const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'Citizen User';
        const userEmail = result.user.email;
        const photoURL = result.user.photoURL;
        const uid = result.user.uid;

        const userObj = {
          userId: uid,
          email: userEmail,
          fullName: displayName,
          photoURL: photoURL,
          provider: 'firebase-google',
        };
        setStoredUser(userObj);

        const authData = await api.auth.firebaseSync(displayName, userEmail);
        if (authData?.accessToken) {
          setToken(authData.accessToken);
        }

        navigate('/app', { replace: true });
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // OTP handlers
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setOtpMessage(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.sendOtp(emailTrimmed);
      playClick();
      setOtpStep('verify');
      setResendTimer(res.coolDownSeconds || 30);
      setOtpMessage(res.message || `OTP code sent to ${emailTrimmed}`);
    } catch (err) {
      setError(err?.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return;
    setError(null);
    setOtpMessage(null);
    setResendLoading(true);
    playClick();

    const emailTrimmed = email.trim();
    try {
      const res = await api.auth.resendOtp(emailTrimmed);
      setResendTimer(res.coolDownSeconds || 30);
      setOtpMessage(res.message || `A new 6-digit OTP code has been sent to ${emailTrimmed}`);
    } catch (err) {
      setError(err?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    playClick();

    const emailTrimmed = email.trim();
    const otpTrimmed = otpCode.trim();
    if (!otpTrimmed || otpTrimmed.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      setLoading(false);
      return;
    }

    try {
      await api.auth.verifyOtp(emailTrimmed, otpTrimmed);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid or expired OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (mode === 'otp') {
      if (otpStep === 'request') {
        return handleSendOtp(e);
      } else {
        return handleVerifyOtp(e);
      }
    }

    setError(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await api.auth.login(emailTrimmed, password);
        signInWithFirebaseEmail(emailTrimmed, password).catch(() => {});
      } else {
        const trimmedName = fullName.trim();
        await api.auth.register(trimmedName, emailTrimmed, password);
        registerWithFirebaseEmail(trimmedName, emailTrimmed, password).catch(() => {});
      }

      playClick();
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not sign you in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-between relative p-3 sm:p-6 transition-colors duration-300 overflow-x-hidden ${
        dark
          ? 'dark bg-[#080808] text-neutral-100 bg-dot-pattern-dark'
          : 'bg-[#fcfdfd] text-neutral-900 bg-dot-pattern-light'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[22vw] font-black tracking-tighter text-neutral-950/[0.04] dark:text-white/[0.06] leading-none font-mono">
          SWATVA
        </span>
      </div>

      <MinimalBrandHeader
        onBack={() => navigate('/')}
        backLabel={t('auth.backToHome') || 'Back to Platform'}
        brandLabel="SWATVA"
        logoKey={loading ? 'busy' : 'idle'}
      />

      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 pt-16 sm:pt-20 pb-16 sm:pb-24 w-full z-10 my-auto">
        <div
          ref={cardRef}
          style={cardStyle}
          className="w-full max-w-[720px] p-4 sm:p-8 sm:pb-10 login-form-card"
        >
          <h1 className="flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-neutral-950 dark:text-white text-center mb-5 sm:mb-6 text-balance">
            {mode === 'login' && <><LogIn size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>Sign in to SWATVA</span></>}
            {mode === 'otp' && <><KeyRound size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>{t('auth.otpMode') || 'Email OTP Validation'}</span></>}
            {mode === 'register' && <><UserPlus size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>Create your SWATVA account</span></>}
          </h1>

          {/* Segmented Control Mode Switcher */}
          <div className="mb-5 p-1 rounded-full neo-glass-card">
            <div className="relative grid grid-cols-3 gap-1">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-[calc(33.333%-2px)] rounded-full bg-neutral-950 dark:bg-white transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  mode === 'otp'
                    ? 'translate-x-[calc(100%+2px)]'
                    : mode === 'register'
                    ? 'translate-x-[calc(200%+4px)]'
                    : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => switchMode('login')}
                aria-pressed={mode === 'login'}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <LogIn size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Password</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('otp')}
                aria-pressed={mode === 'otp'}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'otp'
                    ? 'text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <KeyRound size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                aria-pressed={mode === 'register'}
                className={`relative z-10 inline-flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'text-white dark:text-neutral-950'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <UserPlus size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                <span>Register</span>
              </button>
            </div>
          </div>

          {/* Firebase Domain Authorization / General Error Notification */}
          {error && error.includes('unauthorized-domain') ? (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs text-left leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-100">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                <span>Firebase Domain Authorization Notice</span>
              </div>
              <p>{error}</p>
              <div className="mt-2 text-[11px] font-mono opacity-90">
                You can use <strong>Email OTP</strong> or <strong>Password Login</strong> below to sign in immediately.
              </div>
            </div>
          ) : error ? (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center">
              {error}
            </div>
          ) : null}

          {/* OTP Status Feedback Banner */}
          {otpMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
              {otpMessage}
            </div>
          )}

          {/* Google Quick Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            data-sound="click"
            className="w-full mb-4 flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-white/[0.05] hover:bg-neutral-50 dark:hover:bg-white/[0.08] active:scale-[0.99] text-neutral-800 dark:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Connecting to Google...' : mode === 'register' ? 'Sign up with Google' : 'Sign in with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
            <span className="bg-white dark:bg-[#121216] px-3 text-[10px] uppercase font-mono tracking-widest text-neutral-400 dark:text-neutral-500 shrink-0">
              {mode === 'otp' ? 'or validation via email otp' : 'or continue with email'}
            </span>
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                  Full Name
                </label>
                <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                  <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                Email address
              </label>
              <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  disabled={mode === 'otp' && otpStep === 'verify'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-70"
                />
              </div>
            </div>

            {mode === 'login' || mode === 'register' ? (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                  Password
                </label>
                <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                  <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>
            ) : null}

            {mode === 'otp' && otpStep === 'verify' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 font-semibold">
                    6-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpStep('request')}
                    className="text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                  <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                    <KeyRound size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-base font-mono tracking-widest text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                </div>

                {/* Resend Service Controls */}
                <div className="mt-3 flex items-center justify-between px-1 text-xs">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                    Didn't receive code?
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || resendLoading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
                      resendTimer > 0 || resendLoading
                        ? 'bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-400 cursor-not-allowed'
                        : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 border-transparent shadow-xs'
                    }`}
                  >
                    <RefreshCw size={12} className={resendLoading ? 'animate-spin' : ''} />
                    <span>
                      {resendLoading
                        ? t('auth.resendingOtp') || 'Resending...'
                        : resendTimer > 0
                        ? t('auth.resendOtpIn', { seconds: resendTimer }) || `Resend in ${resendTimer}s`
                        : t('auth.resendOtp') || 'Resend OTP Code'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                data-sound="click"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-neutral-950 hover:bg-neutral-800 active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md cursor-pointer"
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : mode === 'otp'
                    ? otpStep === 'request'
                      ? t('auth.sendOtp') || 'Send OTP Code'
                      : t('auth.verifyAndSignIn') || 'Verify & Sign In'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </span>
                <ArrowRight size={14} className="stroke-[2.2]" />
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-12 py-2.5 sm:py-3 border-t border-neutral-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3 shadow-sm pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-neutral-500 dark:text-neutral-400 font-medium truncate min-w-0">
          SWATVA · CITIZEN EMPOWERMENT ARCHITECTURE
        </span>
        <button
          type="button"
          onClick={() => { playClick(); navigate('/'); }}
          className="text-[11px] font-mono text-neutral-700 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition cursor-pointer font-medium hover:underline flex-shrink-0 whitespace-nowrap"
        >
          Explore Platform &rarr;
        </button>
      </footer>
    </div>
  );
}
