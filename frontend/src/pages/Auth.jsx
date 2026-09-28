import React, { useEffect, useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, ArrowRight, LogIn, UserPlus, KeyRound, RefreshCw, AlertTriangle } from 'lucide-react';
import MinimalBrandHeader from '../components/MinimalBrandHeader';
import LoadingLogo from '../components/LoadingLogo';
import { useTheme } from '../lib/theme';
import { api, getToken, setToken, setStoredUser } from '../api/client';
import { playClick } from '../utils/soundFx';
import { signInWithGoogle, signInWithFirebaseEmail, registerWithFirebaseEmail } from '../lib/firebase';

export default function Auth({ mode: initialMode = 'login' }) {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi' || i18n.language?.startsWith('hi');
  const navigate = useNavigate();
  const { dark } = useTheme();

  const [lastAuthMethod] = useState(() => {
    try {
      return localStorage.getItem('swatva_last_auth_method');
    } catch {
      return null;
    }
  });

  const [lastGoogleAccount] = useState(() => {
    try {
      const raw = localStorage.getItem('swatva_last_google_account');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('swatva_last_auth_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');

  // OTP Validation state & Resend service
  const [otpStep, setOtpStep] = useState('input'); // 'input' | 'otp_verify'
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
    setError(null);
    setOtpMessage(null);
    setOtpStep('input');
    setOtpCode('');
    setMode(next);
  };

  if (getToken()) {
    return <Navigate to="/app" replace />;
  }

  const handleGoogleSignIn = async (loginHint = null) => {
    setError(null);
    setGoogleLoading(true);
    playClick();

    try {
      const result = await signInWithGoogle(loginHint);
      if (result.error) {
        setError(result.error);
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

        try {
          localStorage.setItem('swatva_last_auth_method', 'google');
          if (userEmail) localStorage.setItem('swatva_last_auth_email', userEmail);
          localStorage.setItem(
            'swatva_last_google_account',
            JSON.stringify({ email: userEmail, fullName: displayName, photoURL })
          );
        } catch {}

        navigate('/app', { replace: true });
      }
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Trigger Email Validation OTP
  const handleInitiateRegisterWithOtp = async (e) => {
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
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.auth.sendOtp(emailTrimmed);
      playClick();
      setOtpStep('otp_verify');
      setResendTimer(res.coolDownSeconds || 30);
      setOtpMessage(res.message || `A 6-digit OTP code has been sent to ${emailTrimmed} to verify email ownership.`);
    } catch (err) {
      setError(err?.message || 'Failed to send verification OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP Service Handler
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

  // Complete Registration after OTP validation
  const handleCompleteRegisterOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    playClick();

    const emailTrimmed = email.trim();
    const nameTrimmed = emailTrimmed.includes('@') ? emailTrimmed.split('@')[0] : 'Citizen';
    const otpTrimmed = otpCode.trim();

    if (!otpTrimmed || otpTrimmed.length !== 6) {
      setError('Please enter the complete 6-digit OTP code.');
      setLoading(false);
      return;
    }

    try {
      await api.auth.registerWithOtp(nameTrimmed, emailTrimmed, password, otpTrimmed);
      registerWithFirebaseEmail(nameTrimmed, emailTrimmed, password).catch(() => {});
      try {
        localStorage.setItem('swatva_last_auth_method', 'email');
        localStorage.setItem('swatva_last_auth_email', emailTrimmed);
      } catch {}
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid or expired OTP code. Please check your email and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Standard Sign In or Registration Form Submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (mode === 'register') {
      if (otpStep === 'input') {
        return handleInitiateRegisterWithOtp(e);
      } else {
        return handleCompleteRegisterOtp(e);
      }
    }

    // Login mode
    setError(null);
    setLoading(true);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      await api.auth.login(emailTrimmed, password);
      signInWithFirebaseEmail(emailTrimmed, password).catch(() => {});
      try {
        localStorage.setItem('swatva_last_auth_method', 'email');
        localStorage.setItem('swatva_last_auth_email', emailTrimmed);
      } catch {}
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
          {isHindi ? 'स्वतवा' : 'SWATVA'}
        </span>
      </div>

      <MinimalBrandHeader
        onBack={() => navigate('/')}
        backLabel={t('auth.backToHome') || 'Back to Platform'}
        brandLabel={t('common.appName') || 'SWATVA'}
        logoKey={loading ? 'busy' : 'idle'}
      />

      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 pt-16 sm:pt-20 pb-16 sm:pb-24 w-full z-10 my-auto">
        <div
          className="w-full max-w-[720px] p-4 sm:p-8 sm:pb-10 login-form-card"
        >
          <h1 className="h-7 sm:h-8 flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-neutral-950 dark:text-white text-center mb-5 sm:mb-6 whitespace-nowrap">
            {mode === 'login' && <><LogIn size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>{t('auth.loginTitle') || 'Sign in to SWATVA'}</span></>}
            {mode === 'register' && <><UserPlus size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>{t('auth.registerTitle') || 'Create your SWATVA account'}</span></>}
          </h1>

          {/* Clean 2-Tab Segmented Control */}
          <div className="mb-5 p-1 rounded-full neo-glass-card">
            <div className="relative grid grid-cols-2 gap-1">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-[calc(50%-2px)] rounded-full bg-neutral-950 dark:bg-white transition-transform duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  mode === 'register'
                    ? 'translate-x-[calc(100%+4px)]'
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
                <span>{t('auth.registerSwitchLabel') || 'Sign In'}</span>
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
                <span>{t('auth.loginSwitchLabel') || 'Create Account'}</span>
              </button>
            </div>
          </div>

          {/* Error Notification */}
          {error && error.includes('unauthorized-domain') ? (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs text-left leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-100">
                <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                <span>Firebase Domain Authorization Notice</span>
              </div>
              <p>{error}</p>
              <div className="mt-2 text-[11px] font-mono opacity-90">
                You can sign in or register directly using <strong>Email & Password</strong> below.
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

          {/* Google Quick Sign-In or 1-Click Account Re-Auth Card */}
          {mode === 'login' && lastGoogleAccount ? (
            <div className="mb-4 p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] flex flex-col gap-2.5 shadow-xs transition-all">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  {lastGoogleAccount.photoURL ? (
                    <img
                      src={lastGoogleAccount.photoURL}
                      alt={lastGoogleAccount.fullName}
                      className="w-10 h-10 rounded-full border border-emerald-500/40 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {lastGoogleAccount.fullName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-neutral-950 dark:text-white truncate">
                        {lastGoogleAccount.fullName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t('auth.lastUsed') || 'Last used'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                      {lastGoogleAccount.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(lastGoogleAccount.email)}
                  disabled={loading || googleLoading}
                  data-sound="click"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-neutral-950 dark:bg-white dark:text-neutral-950 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  {googleLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                  )}
                  <span>{t('auth.continueAs', { name: lastGoogleAccount.fullName.split(' ')[0] }) || `Continue as ${lastGoogleAccount.fullName.split(' ')[0]}`}</span>
                </button>
              </div>

              <div className="flex items-center justify-end pt-1 border-t border-emerald-500/15">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn(null)}
                  disabled={loading || googleLoading}
                  className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer hover:underline"
                >
                  {t('auth.useAnotherAccount') || 'Sign in with a different Google account'}
                </button>
              </div>
            </div>
          ) : (
            /* Standard Google Quick Sign-In Button */
            <button
              type="button"
              onClick={() => handleGoogleSignIn(null)}
              disabled={loading || googleLoading}
              data-sound="click"
              className="w-full h-11 mb-4 relative flex items-center justify-center gap-3 px-4 rounded-xl text-xs font-semibold tracking-wide border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-white/[0.05] hover:bg-neutral-50 dark:hover:bg-white/[0.08] active:scale-[0.99] text-neutral-800 dark:text-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer"
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
              <span className="whitespace-nowrap">
                {googleLoading
                  ? (t('common.loading') || 'Connecting...')
                  : mode === 'login'
                  ? (t('auth.signInWithGoogle') || 'Sign in with Google')
                  : (t('auth.signUpWithGoogle') || 'Sign up with Google')}
              </span>
            </button>
          )}

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
            <span className="bg-white dark:bg-[#121216] px-3 flex items-center gap-2 text-[10px] uppercase font-mono tracking-widest text-neutral-400 dark:text-neutral-500 shrink-0">
              <span>{t('auth.orEmail') || 'or continue with email'}</span>
              {mode === 'login' && lastAuthMethod === 'email' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('auth.lastUsed') || 'Last used'}
                </span>
              )}
            </span>
            <div className="border-t border-neutral-200/80 dark:border-white/10 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                {t('auth.email') || 'Email address'}
              </label>
              <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  disabled={mode === 'register' && otpStep === 'otp_verify'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-70"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 mb-1.5 font-semibold">
                {t('auth.password') || 'Password'}
              </label>
              <div className="relative flex items-center h-11 w-full rounded-xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.04] focus-within:border-neutral-900 dark:focus-within:border-neutral-400 transition-colors">
                <div className="w-11 shrink-0 border-r border-neutral-200/80 dark:border-white/10 h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  disabled={mode === 'register' && otpStep === 'otp_verify'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 disabled:opacity-70"
                />
              </div>
            </div>

            {/* Email OTP Verification Step in Registration */}
            {mode === 'register' && otpStep === 'otp_verify' && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-neutral-500 dark:text-neutral-400 font-semibold">
                    {t('auth.enterOtp') || '6-Digit Email Validation OTP'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpStep('input')}
                    className="text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {t('common.back') || 'Edit Details'}
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

                {/* Resend OTP Service Bar */}
                <div className="mt-3 flex items-center justify-between px-1 text-xs">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                    {t('auth.otpNotReceived') || "Didn't receive verification code?"}
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
                className="w-full h-11 flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-neutral-950 hover:bg-neutral-800 active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md cursor-pointer"
              >
                <span className="whitespace-nowrap">
                  {loading
                    ? (t('common.saving') || 'Processing...')
                    : mode === 'login'
                    ? (t('auth.loginSubmit') || 'Sign In')
                    : otpStep === 'input'
                    ? (t('auth.sendOtp') || 'Send Verification OTP')
                    : (t('auth.verifyAndSignIn') || 'Verify OTP & Create Account')}
                </span>
                <ArrowRight size={14} className="stroke-[2.2] flex-shrink-0" />
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 px-4 sm:px-12 py-2.5 sm:py-3 border-t border-neutral-200/80 dark:border-white/10 bg-white/90 dark:bg-[#0c0c10]/90 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3 shadow-sm pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2.5 min-w-0">
          <LoadingLogo size="h-6 w-6" animate={false} />
          <span className="text-xs font-bold tracking-tight text-neutral-950 dark:text-white">
            {isHindi ? 'स्वतवा' : 'SWATVA'}
          </span>
          <span className="h-3 w-px bg-neutral-300 dark:bg-white/20" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-mono text-neutral-500 dark:text-neutral-400 font-medium truncate min-w-0">
            {t('auth.citizenEmpowermentArchitecture') || 'CITIZEN EMPOWERMENT ARCHITECTURE'}
          </span>
        </div>
        <Link
          to="/team"
          onClick={playClick}
          className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 font-medium hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer hover:underline flex-shrink-0 whitespace-nowrap"
        >
          {t('landing.footer.tagline') || 'BY TheQuirkies'}
        </Link>
      </footer>
    </div>
  );
}
