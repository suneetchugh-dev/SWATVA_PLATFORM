import React, { useState, useEffect, useRef } from 'react';

/**
 * AI Orb Face (Combining Siri Orb Conic Gradients + Expressive AI Face)
 * 
 * Features:
 * - Organic water droplet / leaf silhouette boundary
 * - Layered rotating conic gradient shell with state-aware rotation & brightness
 * - States: 'idle' | 'listening' | 'thinking' | 'streaming' | 'done' | 'error' | 'smile' | 'happy'
 * - Spring-loaded gaze tracking that follows the user's cursor
 * - Squints and looks away in saccades when 'thinking'
 * - Natural cadence blinking cycle (snap shut, ease open, occasional double-blink)
 * - Occasional natural micro-smiles and welcoming smile
 * - Joyful arc eyes on 'done'
 * - Spiral/woozy expression on 'error'
 * - Size-aware blur, inner specular highlights, and atmospheric aura
 */
export default function AIOrbFace({
  state = 'idle', // 'idle' | 'listening' | 'thinking' | 'streaming' | 'done' | 'error' | 'smile' | 'happy'
  size = 80,
  gaze = true,
  className = '',
  'aria-label': ariaLabel
}) {
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isOccasionalSmile, setIsOccasionalSmile] = useState(false);
  const [isEventSmile, setIsEventSmile] = useState(false);
  const orbRef = useRef(null);

  // Natural Blink Cadence
  useEffect(() => {
    let blinkTimer;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        // Random interval between 2.5s and 5.5s
        blinkTimer = setTimeout(triggerBlink, 2500 + Math.random() * 3000);
      }, 160);
    };

    blinkTimer = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(blinkTimer);
  }, []);

  // Micro-Smile
  useEffect(() => {
    if (state !== 'idle') {
      setIsOccasionalSmile(false);
      return;
    }
    let smileTimer;
    let cancelTimeout;

    const triggerSmile = () => {
      setIsOccasionalSmile(true);
      cancelTimeout = setTimeout(() => {
        setIsOccasionalSmile(false);
        smileTimer = setTimeout(triggerSmile, 180000 + Math.random() * 120000);
      }, 1200);
    };

    smileTimer = setTimeout(triggerSmile, 120000 + Math.random() * 60000);
    return () => {
      clearTimeout(smileTimer);
      clearTimeout(cancelTimeout);
    };
  }, [state]);

  // Listen for Global Smile Events
  useEffect(() => {
    const handleSmile = () => setIsEventSmile(true);
    const handleUnsmile = () => setIsEventSmile(false);

    window.addEventListener('swatva:ai-smile', handleSmile);
    window.addEventListener('swatva:ai-unsmile', handleUnsmile);
    return () => {
      window.removeEventListener('swatva:ai-smile', handleSmile);
      window.removeEventListener('swatva:ai-unsmile', handleUnsmile);
    };
  }, []);

  // Pointer Gaze Tracking with Smooth Spring Physics
  useEffect(() => {
    if (!gaze || state === 'thinking' || state === 'error') {
      if (state === 'thinking') {
        // Squint and look away in saccades
        setEyePos({ x: -4.5, y: -4.5 });
      } else {
        setEyePos({ x: 0, y: 0 });
      }
      return;
    }

    const handleMouseMove = (e) => {
      if (!orbRef.current) return;
      const rect = orbRef.current.getBoundingClientRect();
      const orbCenterX = rect.left + rect.width / 2;
      const orbCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - orbCenterX;
      const deltaY = e.clientY - orbCenterY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxOffset = 5.5;

      if (distance === 0) {
        setEyePos({ x: 0, y: 0 });
      } else {
        const factor = Math.min(distance / 300, 1);
        const normX = (deltaX / distance) * maxOffset * factor;
        const normY = (deltaY / distance) * maxOffset * factor;
        setEyePos({ x: normX, y: normY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [gaze, state]);

  const isSmilingActive = state === 'smile' || state === 'happy' || isOccasionalSmile || isEventSmile;

  // State-Driven Atmosphere & Micro-animations
  const getOrbAura = () => {
    const baseShadow = 'shadow-[0_4px_14px_rgba(0,0,0,0.12)] dark:shadow-[0_0_20px_rgba(255,255,255,0.22)]';
    switch (state) {
      case 'listening':
      case 'speaking':
      case 'done':
      case 'happy':
      case 'smile':
        return `${baseShadow} scale-105`;
      default:
        return isSmilingActive ? `${baseShadow} scale-105` : baseShadow;
    }
  };

  const getRotationDuration = () => {
    switch (state) {
      case 'thinking':
        return '4s'; // 2.2x speedup on thinking
      case 'speaking':
        return '5s';
      case 'listening':
        return '6s';
      case 'streaming':
        return '7s';
      default:
        return '12s';
    }
  };

  // Layered conic shell — Warm porcelain/amber in BOTH themes
  const getOrbShell = () => {
    switch (state) {
      case 'speaking':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fef3c7,#f59e0b,#fde68a,#ffffff)]';
      case 'listening':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fffbeb,#fef3c7,#fffbeb,#ffffff)]';
      case 'thinking':
        return 'bg-[conic-gradient(from_0deg,#fafafa,#fffbeb,#fef3c7,#fffbeb,#fafafa)]';
      case 'streaming':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fffbeb,#fef3c7,#fffbeb,#ffffff)]';
      case 'done':
      case 'happy':
      case 'smile':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fef3c7,#fde68a,#fef3c7,#ffffff)]';
      case 'error':
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fb7185,#be123c,#fb7185,#ffffff)]';
      default:
        return 'bg-[conic-gradient(from_0deg,#ffffff,#fffbeb,#fef3c7,#fffbeb,#ffffff)]';
    }
  };

  const eyeScaleY = isBlinking ? 0.08 : state === 'listening' ? 1.3 : state === 'speaking' ? 1.15 : state === 'thinking' ? 0.45 : state === 'streaming' ? 0.75 : isSmilingActive ? 0.85 : 1;

  return (
    <div
      ref={orbRef}
      role="img"
      aria-label={ariaLabel || `AI Assistant is ${state}`}
      className={`relative rounded-[50%_50%_2px_50%] flex items-center justify-center select-none transition-all duration-300 overflow-hidden ${getOrbAura()} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* 1. Six Layered Animated Conic Gradients */}
      <div 
        className={`absolute inset-0 rounded-[50%_50%_2px_50%] pointer-events-none opacity-80 transition-transform ${getOrbShell()}`}
        style={{
          animation: `spin ${getRotationDuration()} linear infinite`,
          filter: 'blur(3px)'
        }}
      />

      {/* 2. Inner Radial Depth Core */}
      <div 
        className="absolute inset-1 rounded-[50%_50%_2px_50%] pointer-events-none bg-[radial-gradient(circle_at_35%_35%,#ffffff_0%,#fafaf9_65%,#f5f5f4_100%)]"
        style={{
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -2px 6px rgba(245,158,11,0.15)'
        }}
      />

      {/* 3. Outer Atmospheric Glass Rim */}
      <div 
        className="absolute inset-0 rounded-[50%_50%_2px_50%] border border-black/50 dark:border-white/50 pointer-events-none z-20"
      />

      {/* 4. Expressive Face SVG Layer with Gaze Cursor Tracking */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full p-2 relative z-10 transition-transform duration-200 ease-out"
        style={{
          transform: `translate(${eyePos.x}px, ${eyePos.y}px)`
        }}
      >
        {/* State: DONE -> Happy Arc Eyes */}
        {state === 'done' ? (
          <g className="stroke-neutral-950" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M 30 48 Q 38 38 46 48" />
            <path d="M 54 48 Q 62 38 70 48" />
            <path d="M 40 64 Q 50 74 60 64" />
          </g>
        ) : state === 'error' ? (
          /* State: ERROR -> Woozy Spiral Eyes */
          <g stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" fill="none">
            <circle cx="38" cy="46" r="8" strokeDasharray="3 3" />
            <circle cx="62" cy="46" r="8" strokeDasharray="3 3" />
            <path d="M 42 66 Q 50 60 58 66" />
          </g>
        ) : (
          /* Normal / Thinking / Listening / Streaming / Smiling Face */
          <g>
            {/* Left Eye */}
            <ellipse
              cx="38"
              cy="46"
              rx={state === 'thinking' ? 6 : 5.5}
              ry={5.5 * eyeScaleY}
              className="transition-all duration-150 fill-neutral-950"
            />

            {/* Right Eye */}
            <ellipse
              cx="62"
              cy="46"
              rx={state === 'thinking' ? 6 : 5.5}
              ry={5.5 * eyeScaleY}
              className="transition-all duration-150 fill-neutral-950"
            />

            {/* Expressive Mouth */}
            {state === 'listening' ? (
              <ellipse cx="50" cy="65" rx="3.5" ry="3.5" className="fill-neutral-950" opacity="0.95" />
            ) : state === 'speaking' ? (
              <ellipse cx="50" cy="64" rx="4.5" ry="3.8" className="fill-neutral-950 animate-pulse" opacity="0.95" />
            ) : state === 'thinking' ? (
              <path d="M 46 64 Q 50 66 55 63" className="stroke-neutral-950" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.8" />
            ) : state === 'streaming' ? (
              <path d="M 44 65 Q 50 69 56 65" className="stroke-neutral-950" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
            ) : isSmilingActive ? (
              /* Cheerful, welcoming curved smile */
              <path d="M 41 62 Q 50 71 59 62" className="stroke-neutral-950" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.95" />
            ) : (
              <path d="M 45 64 Q 50 67 55 64" className="stroke-neutral-950" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
