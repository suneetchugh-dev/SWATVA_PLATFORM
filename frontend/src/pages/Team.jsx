import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Code2, 
  Users2, 
  Shield, 
  Radio, 
  ArrowUpRight, 
  Cpu, 
  Building2, 
  Award, 
  CheckCircle2, 
  X,
  ArrowLeft,
  Scale,
  FileStack,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { TEAM_MEMBERS, PLATFORM_STATS, PROJECT_DETAILS, CORE_PILLARS } from '../data/team';
import { playClick } from '../utils/soundFx';
import LoadingLogo from '../components/LoadingLogo';
import ThemeToggle from '../components/ThemeToggle';
import FooterParticles from '../components/FooterParticles';
import DragScrollController from '../components/DragScrollController';
import { getToken } from '../api/client';

export default function Team() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const isHindi = i18n.language === 'hi';

  const [lightboxMember, setLightboxMember] = useState(null);
  const [lightboxTilt, setLightboxTilt] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || window.pageYOffset || 0;
      setScrolled(scrollPos > 24);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!lightboxMember) {
      setLightboxTilt({ x: 0, y: 0 });
      return;
    }
    document.documentElement.classList.add('lightbox-active');
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        playClick();
        setLightboxMember(null);
        setLightboxTilt({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
        if (idx !== -1) {
          playClick();
          setLightboxMember(TEAM_MEMBERS[(idx - 1 + TEAM_MEMBERS.length) % TEAM_MEMBERS.length]);
          setLightboxTilt({ x: 0, y: 0 });
        }
      } else if (e.key === 'ArrowRight') {
        const idx = TEAM_MEMBERS.findIndex((m) => m.id === lightboxMember.id);
        if (idx !== -1) {
          playClick();
          setLightboxMember(TEAM_MEMBERS[(idx + 1) % TEAM_MEMBERS.length]);
          setLightboxTilt({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('lightbox-active');
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxMember]);

  const handleLightboxMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setLightboxTilt({
      x: Math.max(-1, Math.min(1, x)) * 10,
      y: Math.max(-1, Math.min(1, y)) * -10,
    });
  };

  const handleLightboxMouseLeave = () => {
    setLightboxTilt({ x: 0, y: 0 });
  };

  const handleBack = () => {
    playClick();
    if (getToken()) {
      navigate('/app');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      {/* Monumental Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[18vw] font-black tracking-tighter text-neutral-950/[0.03] dark:text-white/[0.04] leading-none font-mono">
          THEQUIRKIES
        </span>
      </div>

      {/* Header Bar */}
      <header className={`team-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="flex items-center z-10">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-900 dark:bg-neutral-800/90 dark:hover:bg-neutral-700/90 dark:text-neutral-100 border border-neutral-200/80 dark:border-white/20 shadow-xs dark:shadow-md transition-all cursor-pointer select-none active:scale-95"
          >
            <ArrowLeft size={13} className="text-neutral-700 dark:text-neutral-200" />
            <span>{isHindi ? 'वापस जाएं' : 'Back to App'}</span>
          </button>
        </div>

        {/* Absolute Mathematically Centered Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full group"
            title={getToken() ? (isHindi ? 'डैशबोर्ड पर जाएं' : 'Go to Dashboard') : (isHindi ? 'मुख्य पृष्ठ पर जाएं' : 'Go to Home')}
            aria-label={getToken() ? (isHindi ? 'डैशबोर्ड पर जाएं' : 'Go to Dashboard') : (isHindi ? 'मुख्य पृष्ठ पर जाएं' : 'Go to Home')}
          >
            <div className="relative h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center flex-shrink-0">
              {/* Amber Aura Glow matching login header */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-2 rounded-full bg-amber-500/35 blur-lg scale-100 hidden dark:block pointer-events-none transition-all duration-300 ease-out group-hover:bg-amber-500/60 group-hover:blur-xl group-hover:scale-115"
              />
              <LoadingLogo animate={false} size="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 z-10">
          <ThemeToggle darkMode={dark} toggleTheme={toggle} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 w-full relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 relative">
          {/* Amber Aura Halo */}
          <div
            aria-hidden="true"
            className="absolute -top-16 left-1/2 -translate-x-1/2 w-[420px] sm:w-[560px] h-[260px] sm:h-[320px] bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.18),_transparent_70%)] rounded-full blur-3xl pointer-events-none -z-0"
          />

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 mb-3 shadow-sm">
            <Users2 size={13} className="text-amber-400 dark:text-amber-500" />
            TheQuirkies
          </span>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-950 dark:text-white mb-4 text-balance">
            {isHindi ? 'मीट द क्वर्कीज़' : 'Meet TheQuirkies'}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            {isHindi
              ? 'SWATVA सार्वजनिक कल्याण प्लेटफ़ॉर्म के पीछे समर्पित डेवलपर्स और सिस्टम आर्किटेक्ट्स।'
              : 'The multidisciplinary engineering team behind SWATVA — deterministic welfare evaluation, vernacular RAG intelligence, and zero-middleman civic infrastructure.'}
          </p>
        </div>

        {/* Team Grid */}
        <div id="members" className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {TEAM_MEMBERS.map((member) => (
            <div 
              key={member.id}
              className="neo-glass-card p-5 sm:p-7 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-neutral-950/5 dark:bg-white/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-125" />

              <div>
                {/* Avatar & Social Row */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setLightboxMember(member);
                      }}
                      className="block group/avatar cursor-zoom-in focus:outline-none rounded-2xl"
                      title="View full photo"
                      aria-label={`View photo — ${member.name}`}
                    >
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = member.fallbackAvatar;
                        }}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white dark:border-amber-400/35 shadow-md dark:shadow-[0_0_16px_rgba(245,158,11,0.22)] transition duration-300 group-hover:scale-105 group-hover/avatar:ring-2 group-hover/avatar:ring-amber-400/80 group-hover/avatar:shadow-[0_0_22px_rgba(245,158,11,0.45)]"
                      />
                    </button>
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex items-center justify-center font-mono text-[9px] font-bold shadow-xs">
                      {member.role === 'Team Leader' ? 'LEAD' : 'DEV'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-neutral-400 shrink-0">
                    {member.github && (
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-950 dark:hover:text-white transition"
                        title="GitHub"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      </a>
                    )}
                    {member.linkedin && (
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-neutral-950 dark:hover:text-white transition"
                        title="LinkedIn"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-neutral-950 dark:text-white tracking-tight min-w-0">
                    {member.name}
                  </h3>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 font-bold uppercase whitespace-nowrap">
                    {member.role}
                  </span>
                </div>

                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1">
                  {member.title}
                </div>
                <div className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5 mb-3">
                  {member.domain} · {member.college}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
                  {member.bio}
                </p>
              </div>

              {/* Tags */}
              <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-white/5 flex flex-wrap gap-1.5">
                {member.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-neutral-100/80 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border border-neutral-200/60 dark:border-white/5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Core Architectural Pillars */}
        <div id="pillars" className="p-6 sm:p-10 rounded-3xl neo-glass-card mb-10 sm:mb-12">
          <div className="mb-6 pb-4 border-b border-neutral-200/60 dark:border-white/10">
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold block mb-1">
              SYSTEM FOUNDATIONS
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 dark:text-white">
              Architectural Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CORE_PILLARS.map((pillar, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.03] border border-neutral-200/40 dark:border-white/5 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs font-black text-neutral-400 mb-2">0{idx + 1}.</div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-1.5">{pillar.title}</h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Architecture Metrics Bar */}
        <div id="benchmarks" className="p-6 sm:p-10 rounded-3xl neo-glass-card">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-200/60 dark:border-white/10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold block mb-1">
                TELEMETRY & VERIFICATION
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-neutral-950 dark:text-white">
                Platform Benchmarks
              </h2>
            </div>
            <button
              onClick={() => { playClick(); navigate('/app'); }}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 transition cursor-pointer flex items-center space-x-2 shadow-xs group"
            >
              <span>{isHindi ? 'डैशबोर्ड खोलें' : 'Open Dashboard'}</span>
              <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            {PLATFORM_STATS.map((stat, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.03] border border-neutral-200/40 dark:border-white/5 transition-all duration-300 hover:-translate-y-1">
                <div className="text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white tracking-tight mb-1 font-mono">
                  {stat.value}
                </div>
                <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {stat.label}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                  {stat.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ----------------- Dynamic Pointillism Particle Canvas */}
      <div className="w-full border-t border-neutral-200/50 dark:border-white/5 py-4">
        <FooterParticles text="THEQUIRKIES" darkMode={dark} />
      </div>

      {/* -------------------------------------------- footer */}
      <footer className="w-full relative border-t border-neutral-200 dark:border-white/15 py-8 px-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-600 dark:text-neutral-300 gap-3 mt-6">
        {/* Absolute Centered Top-Border Scroll-to-Top Button */}
        <button
          type="button"
          onClick={() => {
            playClick();
            window.dispatchEvent(new CustomEvent('swatva-trigger-particle-dissolve'));
            setTimeout(() => {
              if (window.lenis) {
                window.lenis.scrollTo(0, { duration: 1.2 });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }, 320);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('swatva-reset-particles'));
            }, 1600);
          }}
          className="footer-scroll-top"
          aria-label="Scroll to top"
          title="Scroll to top"
          data-sound="click"
        >
          <img
            src="/cursors/scroll-up.svg"
            className="scroll-up-img pointer-events-none"
            alt="Scroll to top"
            width="17"
            height="17"
          />
        </button>

        <div className="flex items-center gap-2.5">
          <LoadingLogo size="h-7 w-7" animate={false} />
          <span className="text-xs font-bold tracking-tight text-neutral-950 dark:text-white">SWATVA</span>
          <span className="h-3 w-px bg-neutral-300 dark:bg-white/20" aria-hidden="true" />
          <Link
            to="/team"
            onClick={playClick}
            title={isHindi ? 'हमारी टीम से मिलें' : 'Meet our team'}
            className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 font-medium hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'द क्वर्कीज़ द्वारा' : 'BY TheQuirkies'}
          </Link>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-neutral-600 dark:text-neutral-300 font-medium">
          <a
            href="#members"
            onClick={(e) => {
              e.preventDefault();
              playClick();
              if (window.lenis) {
                window.lenis.scrollTo('#members', { offset: -90, duration: 1.2 });
              } else {
                document.getElementById('members')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'टीम सदस्य' : 'Team'}
          </a>
          <a
            href="#pillars"
            onClick={(e) => {
              e.preventDefault();
              playClick();
              if (window.lenis) {
                window.lenis.scrollTo('#pillars', { offset: -90, duration: 1.2 });
              } else {
                document.getElementById('pillars')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'स्तंभ' : 'Pillars'}
          </a>
          <a
            href="#benchmarks"
            onClick={(e) => {
              e.preventDefault();
              playClick();
              if (window.lenis) {
                window.lenis.scrollTo('#benchmarks', { offset: -90, duration: 1.2 });
              } else {
                document.getElementById('benchmarks')?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isHindi ? 'बेंचमार्क' : 'Benchmarks'}
          </a>
          <button
            type="button"
            onClick={() => {
              playClick();
              if (getToken()) {
                navigate('/app');
              } else {
                navigate('/');
              }
            }}
            className="hover:text-neutral-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            {getToken() ? (isHindi ? 'डैशबोर्ड' : 'Dashboard') : (isHindi ? 'होम' : 'Home')}
          </button>
        </div>
      </footer>

      {/* Global Draggable Diagonal Scroll Controller */}
      <DragScrollController />

      {/* Profile Photo Lightbox Portalled to Document Body */}
      {typeof document !== 'undefined' && lightboxMember && createPortal(
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 select-none"
          onClick={() => {
            playClick();
            setLightboxMember(null);
            setLightboxTilt({ x: 0, y: 0 });
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo viewer - ${lightboxMember.name}`}
        >
          {/* Ambient Golden Radial Glow Aura behind modal */}
          <div
            aria-hidden="true"
            className="absolute w-[360px] sm:w-[480px] h-[360px] sm:h-[480px] rounded-full bg-amber-500/20 dark:bg-amber-400/25 blur-3xl pointer-events-none"
          />

          <div
            onMouseMove={handleLightboxMouseMove}
            onMouseLeave={handleLightboxMouseLeave}
            style={{
              transform: `perspective(900px) rotateX(${lightboxTilt.y}deg) rotateY(${lightboxTilt.x}deg) scale3d(1.015, 1.015, 1.015)`,
              transition: lightboxTilt.x === 0 && lightboxTilt.y === 0 ? 'transform 0.4s ease-out' : 'transform 0.08s ease-out',
              willChange: 'transform',
            }}
            className="relative max-w-sm sm:max-w-md w-full rounded-3xl overflow-hidden bg-white/95 dark:bg-[#121316] border-2 border-amber-500/60 dark:border-amber-400/50 shadow-2xl shadow-amber-500/25 dark:shadow-[0_0_60px_rgba(245,158,11,0.35)] backdrop-blur-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Close Button */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setLightboxMember(null);
                  setLightboxTilt({ x: 0, y: 0 });
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 text-white transition-all cursor-pointer backdrop-blur-md border border-white/10 shadow-xs active:scale-95"
                aria-label="Close photo"
              >
                <X size={15} />
              </button>
            </div>

            {/* Profile Image View Area */}
            <div className="relative w-full aspect-square bg-neutral-900 overflow-hidden flex items-center justify-center">
              <img
                src={lightboxMember.avatar}
                alt={lightboxMember.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = lightboxMember.fallbackAvatar;
                }}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>

            {/* Member Details Footer inside Lightbox */}
            <div className="p-5 text-center border-t border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#121316]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-950 dark:text-white">
                  {lightboxMember.name}
                </h3>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30 font-bold uppercase">
                  {lightboxMember.role}
                </span>
              </div>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {lightboxMember.title}
              </p>
              <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 mt-0.5">
                {lightboxMember.domain} · {lightboxMember.college}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function memberTitle(m) {
  return `${m.title} · ${m.domain}`;
}
