import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Mail, Lock, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import MinimalBrandHeader from '../components/MinimalBrandHeader';
import { useTheme } from '../lib/theme';
import { api, getToken } from '../api/client';
import { playClick } from '../utils/soundFx';

export default function Auth({ mode: initialMode = 'login' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dark } = useTheme();

  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // The two modes carry different field counts, so the card's natural height
  // differs. Left alone the box snaps to the new size on every switch, and since
  // the page is vertically centred that also drags the whole card up or down — a
  // double jolt. The standard fix is to measure, pin the current height, then
  // ease to the new one and hand the height back to `auto` once it lands. That
  // keeps the inputs at their real size throughout, unlike a scale-based FLIP
  // which would shrink the type while it moves.
  const cardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(null);
  const animatingHeight = useRef(false);

  const switchMode = (next) => {
    if (next === mode) return;
    playClick();
    const el = cardRef.current;
    if (el) {
      animatingHeight.current = true;
      setCardHeight(el.offsetHeight);
    }
    setError(null);
    setMode(next);
  };

  // Runs after the new mode's fields are in the DOM but before paint, so the
  // pinned height is committed and only then released to the target. Batching
  // both into one update is what makes the card jump instead of ease.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !animatingHeight.current) return undefined;
    const target = el.scrollHeight;
    const frame = requestAnimationFrame(() => setCardHeight(target));
    // Timer rather than transitionend: child colour transitions also fire
    // transitionend, so listening on the card would settle on the wrong event.
    const settle = window.setTimeout(() => {
      animatingHeight.current = false;
      setCardHeight(null);
    }, 380);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [mode]);

  const cardStyle = useMemo(
    () =>
      cardHeight == null
        ? undefined
        : {
            height: `${cardHeight}px`,
            // `overflow: hidden` only while pinned, so the incoming field is
            // revealed as the box grows rather than spilling past the edge.
            overflow: 'hidden',
            transition: 'height 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          },
    [cardHeight],
  );

  // Redirect if already authenticated. This has to stay below every hook call —
  // returning above them changes the hook count between renders, which React
  // rejects outright.
  if (getToken()) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
      } else {
        await api.auth.register(fullName.trim(), emailTrimmed, password);
      }
      playClick();
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err?.message || 'Could not sign you in. Please try again.');
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
      {/* Monumental Background Typography Watermark - Acclaimed SAHNIRMAAN Style */}
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

      {/* Main Content Area: Absolute Geometric & Optical Centering with Responsive Padding */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 pt-16 sm:pt-20 pb-16 sm:pb-24 w-full z-10 my-auto">
        <div
          ref={cardRef}
          style={cardStyle}
          className="w-full max-w-[720px] p-4 sm:p-8 sm:pb-10 login-form-card"
        >
          <h1 className="flex items-center justify-center gap-2 text-base sm:text-lg font-bold text-neutral-950 dark:text-white text-center mb-5 sm:mb-6 text-balance">
            {mode === 'login'
              ? <><LogIn size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>Sign in to SWATVA</span></>
              : <><UserPlus size={16} className="stroke-[2] flex-shrink-0" aria-hidden="true" /><span>Create your SWATVA account</span></>}
          </h1>

            {/* Form Mode Tabs: Sign In / Create Account */}
            <div className="flex items-center justify-center gap-3 mb-5 border-b border-neutral-200/80 dark:border-white/10 pb-3">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold pb-1 relative transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'text-neutral-950 dark:text-white'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <LogIn size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                Sign In to Account
                {mode === 'login' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold pb-1 relative transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'text-neutral-950 dark:text-white'
                    : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <UserPlus size={13} className="stroke-[2] flex-shrink-0" aria-hidden="true" />
                Create New Account
                {mode === 'register' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-950 dark:bg-white rounded-full" />
                )}
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            {/* Authentication Form */}
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    autoComplete="email"
                    className="h-full flex-1 block w-full min-w-0 bg-transparent border-none focus:ring-0 outline-none px-3.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                  />
                </div>
              </div>

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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  data-sound="click"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-neutral-950 hover:bg-neutral-800 active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to SWATVA' : 'Create Account & Access'}</span>
                  <ArrowRight size={14} className="stroke-[2.2]" />
                </button>
              </div>
            </form>
        </div>
      </main>

      {/* Bottom Trust Bar - Clean High-Contrast Monochrome */}
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
