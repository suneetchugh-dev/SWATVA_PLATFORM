import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users2, Shield, Sparkles, ExternalLink, Award, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playClick } from '../utils/soundFx';

const TEAM_MEMBERS = [
  {
    name: 'Suneet Chugh',
    role: 'Full-Stack Architecture & AI Integration',
    avatar: 'SC',
    github: 'https://github.com/ClusterGuilders',
    tags: ['Spring Boot', 'React', 'AI/RAG']
  },
  {
    name: 'Team ClusterGuilders',
    role: 'Societal Innovation & Civic Tech Engineering',
    avatar: 'CG',
    github: 'https://github.com/ClusterGuilders',
    tags: ['Public Digital Infrastructure', 'UX/A11y']
  }
];

export default function MeetTeamModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.documentElement.classList.add('lightbox-active');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.classList.remove('lightbox-active');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-[#0c0c0e] border border-neutral-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-in zoom-in-95 duration-250 p-5 sm:p-7 font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => { playClick(); onClose(); }}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/20 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={15} />
        </button>

        {/* Header */}
        <div className="border-b border-neutral-200/80 dark:border-white/10 pb-4 mb-4 pr-8">
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Users2 size={16} className="text-amber-600 dark:text-amber-400 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-neutral-950 dark:text-white">
                ClusterGuilders
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                Societal Innovation Team
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
            {i18n.language === 'hi'
              ? 'नागरिकों को सरकारी योजनाओं से सीधे जोड़ने के लिए समर्पित तकनीकी टीम।'
              : 'Engineered with deterministic evaluation pipelines, vernacular AI assistance, and citizen-first empathy.'}
          </p>
        </div>

        {/* Team Cards */}
        <div className="space-y-3">
          {TEAM_MEMBERS.map((member, i) => (
            <div 
              key={i}
              className="p-3.5 rounded-2xl bg-neutral-50/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/10 transition-all flex items-center gap-3.5"
            >
              <div className="w-11 h-11 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-sm flex items-center justify-center flex-shrink-0 ring-2 ring-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                {member.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-950 dark:text-white truncate">
                    {member.name}
                  </h3>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
                    title="GitHub"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </a>
                </div>
                <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {member.role}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {member.tags.map((t, idx) => (
                    <span 
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-medium bg-neutral-200/60 dark:bg-white/10 text-neutral-700 dark:text-neutral-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mission note */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
          ⭐ Built for empowering citizens with transparent and zero-friction government benefit access.
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
