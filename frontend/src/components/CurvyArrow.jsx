import React, { useEffect, useRef, useState } from 'react';

/**
 * Modern Minimalist CurvyArrow with Mathematically Seamless Infinite Dash-March
 * Adapted from SAHNIRMAAN for SWATVA.
 * 
 * Dash Math for 100% Seamless Infinite Loop:
 * - Dash: 6px, Gap: 6px -> Total Cycle Period = 12px
 * - Travel distance: Exactly 24px (2 complete periods)
 * - 0px -> -24px loop ensures frame 0 and frame 100% are identical, eliminating all loop stutter/glitches.
 */
export default function CurvyArrow({ 
  direction = 'top-left', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className = '',
  label = '',
  hoverOnly = false,
  active = false,
  // Explicit visibility override. When supplied it wins over the scroll/active
  // logic, which is what lets a caller tie the reveal to an interaction — the
  // search arrow showing on hover/focus instead of whenever it scrolls into
  // view. Left undefined, the original behaviour is unchanged.
  visible,
  // The reveal is a 1s ease by default, which suits a scroll-in reveal. An
  // interaction-triggered one needs to answer the pointer faster.
  revealDuration = 1000
}) {
  const [inView, setInView] = useState(false);
  const arrowRef = useRef(null);

  useEffect(() => {
    if (hoverOnly) return;
    // Nothing to observe when the caller is driving visibility directly.
    if (visible !== undefined) return;
    const el = arrowRef.current?.parentElement || arrowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hoverOnly, visible]);

  const isVisible = visible !== undefined
    ? visible
    : active || (hoverOnly ? false : inView);

  const getDirectionTransform = () => {
    switch (direction) {
      case 'top-right':
        return 'scaleX(-1) rotate(2deg)';
      case 'bottom-left':
        return 'scaleY(-1) rotate(-2deg)';
      case 'bottom-right':
        return 'scale(-1) rotate(2deg)';
      default:
        return 'rotate(-2deg)';
    }
  };

  return (
    <span 
      ref={arrowRef}
      style={{ transitionDuration: `${revealDuration}ms` }}
      className={`absolute inline-flex flex-col items-center select-none pointer-events-none text-neutral-900 dark:text-white transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] z-20 ${
        hoverOnly 
          ? 'opacity-0 group-hover:opacity-100' 
          : (isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none')
      } ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes seamlessDashMarch {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -24;
          }
        }

        @keyframes arrowheadPopIn {
          0% {
            opacity: 0;
            transform: scale(0.2);
          }
          60% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .arrow-flowing-trail {
          stroke-dasharray: 6 6;
          animation: seamlessDashMarch 2s linear infinite;
        }

        .arrow-fast-trail {
          stroke-dasharray: 6 6;
          animation: seamlessDashMarch 1.25s linear infinite;
        }

        .arrowhead-spring-pop {
          transform-origin: 80px 80px;
          animation: arrowheadPopIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Label: Minimal Clean Monospace Tag */}
      {label && (
        <span 
          className={`font-mono text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap mb-1 shadow-2xs transition-all duration-300 ${
            active
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 scale-105 shadow-md ring-1 ring-amber-500/30'
              : 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border border-neutral-800 dark:border-white/20'
          }`}
        >
          {label}
        </span>
      )}

      {/* SVG Canvas with Aerodynamic Tilt */}
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-14 h-14 sm:w-16 sm:h-16 stroke-current text-neutral-800 dark:text-neutral-200 transition-transform duration-300 ease-out"
        style={{
          transform: `${getDirectionTransform()} ${active ? 'scale(1.06)' : 'scale(1)'}`
        }}
      >
        {/* Seamless 100% Infinitely Flowing Dotted Trail */}
        <path 
          d="M77,81 C55,72 40,68 55,55 C70,38 55,20 25,25" 
          stroke="currentColor" 
          strokeWidth={active ? "2.2" : "1.8"} 
          strokeLinecap="round" 
          className={active ? "arrow-fast-trail text-neutral-950 dark:text-white" : "arrow-flowing-trail"}
        />

        {/* Minimal Arrowhead with Subtle Pop */}
        <path 
          d="M85,85 L74,84 L78,77 Z" 
          fill="currentColor"
          className="arrowhead-spring-pop"
          style={{
            transform: active ? 'scale(1.1)' : 'scale(1)',
            transformOrigin: '80px 80px',
            transition: 'transform 0.2s ease'
          }}
        />
      </svg>
    </span>
  );
}
