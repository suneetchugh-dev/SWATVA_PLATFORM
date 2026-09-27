import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getToken } from '../api/client';

export default function Team() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const isHindi = i18n.language === 'hi';

  const [lightboxMember, setLightboxMember] = useState(null);
  const [lightboxTilt, setLightboxTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxMember) setLightboxMember(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxMember]);

  const handleBack = () => {
    playClick();
    if (getToken()) {
      navigate('/app');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden bg-porcelain dark:bg-obsidian text-neutral-950 dark:text-white">
      {/* Monumental Background Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none z-0 overflow-hidden">
        <span className="text-[18vw] font-black tracking-tighter text-neutral-950/[0.03] dark:text-white/[0.04] leading-none font-mono">
          THEQUIRKIES
        </span>
      </div>

      {/* Header Bar */}
      <header className="sticky top-0 z-40 pt-3 px-3 sm:px-5">
        <div className="mx-auto max-w-6xl neo-glass-card px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-white/[0.06] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>{isHindi ? 'वापस जाएं' : 'Back to App'}</span>
            </button>
            <div className="h-4 w-px bg-neutral-200 dark:bg-white/10" />
            <div className="flex items-center gap-2">
              <LoadingLogo animate={false} />
              <span className="font-bold text-sm tracking-tight text-neutral-950 dark:text-white">
                SWATVA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle darkMode={dark} toggleTheme={toggle} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 w-full relative z-10">
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
            {isHindi ? 'अभियांत्रिकी एवं विकास टीम' : 'Meet TheQuirkies'}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl mx-auto">
            {isHindi
              ? 'SWATVA सार्वजनिक कल्याण प्लेटफ़ॉर्म के पीछे समर्पित डेवलपर्स और सिस्टम आर्किटेक्ट्स।'
              : 'The multidisciplinary engineering team behind SWATVA — deterministic welfare evaluation, vernacular RAG intelligence, and zero-middleman civic infrastructure.'}
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16">
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
                      onClick={() => setLightboxMember(member)}
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
        <div className="p-6 sm:p-10 rounded-3xl neo-glass-card mb-10 sm:mb-12">
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
        <div className="p-6 sm:p-10 rounded-3xl neo-glass-card">
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

      {/* Profile Photo Lightbox Viewer with 3D Tilt */}
      {lightboxMember && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-8 bg-black/80 dark:bg-[#080808]/92 backdrop-blur-md"
          onClick={() => setLightboxMember(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full rounded-3xl overflow-hidden bg-white dark:bg-[#151618] border border-amber-500/60 dark:border-amber-400/50 shadow-2xl shadow-amber-500/10 dark:shadow-[0_0_50px_rgba(245,158,11,0.28)] transition-transform duration-300 ease-out"
            style={{ transform: `perspective(800px) rotateX(${lightboxTilt.y}deg) rotateY(${lightboxTilt.x}deg) scale(1.015)` }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
              const y = -((e.clientY - rect.top) / rect.height - 0.5) * 14;
              setLightboxTilt({ x, y });
            }}
            onMouseLeave={() => setLightboxTilt({ x: 0, y: 0 })}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => setLightboxMember(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/80 dark:bg-black/60 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-black transition cursor-pointer border border-neutral-200 dark:border-white/10 shadow-xs"
              >
                <X size={15} />
              </button>
            </div>
            <img
              src={lightboxMember.avatar}
              alt={lightboxMember.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = lightboxMember.fallbackAvatar;
              }}
              className="w-full aspect-square object-cover bg-neutral-100 dark:bg-white/5"
            />
            <div className="p-5 text-center border-t border-neutral-200/70 dark:border-white/10">
              <h3 className="text-base font-bold text-neutral-950 dark:text-white">{lightboxMember.name}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{memberTitle(lightboxMember)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function memberTitle(m) {
  return `${m.title} · ${m.domain}`;
}
