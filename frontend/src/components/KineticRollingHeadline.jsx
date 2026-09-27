import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function KineticRollingHeadline({ className = '' }) {
  const { i18n } = useTranslation();
  
  const isHindi = i18n.language?.startsWith('hi');

  const phrases = isHindi ? [
    "हर योजना जिसके आप पात्र हैं।",
    "छूटे हुए लाभ की तुरंत रिकवरी।",
    "20+ कल्याणकारी योजनाओं का मिलान।",
    "दस्तावेज़ तैयारी की जांच।",
    "पारदर्शी AI सहायता।"
  ] : [
    "Every scheme you qualify for.",
    "Unclaimed benefits recovered.",
    "20+ Welfare schemes matched.",
    "Document readiness verified.",
    "Transparent AI guidance."
  ];

  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Reset index if language changes
  useEffect(() => {
    setIndex(0);
    setPrevIndex(null);
    setAnimating(false);
  }, [i18n.language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrevIndex(index);
      setAnimating(true);
      setIndex((prev) => (prev + 1) % phrases.length);

      const endTimer = setTimeout(() => {
        setAnimating(false);
        setPrevIndex(null);
      }, 700);

      return () => clearTimeout(endTimer);
    }, 3600);

    return () => clearInterval(timer);
  }, [index, phrases.length]);

  const current = phrases[index] || phrases[0];
  const previous = prevIndex !== null ? phrases[prevIndex] : null;

  return (
    <span className={`inline-grid grid-cols-1 grid-rows-1 relative overflow-hidden align-bottom py-1.5 -my-1.5 leading-[1.25] ${className}`}>
      {/* Permanent baseline sizer to ensure layout stability */}
      <span className="invisible opacity-0 select-none pointer-events-none col-start-1 row-start-1 whitespace-nowrap py-1 leading-[1.25]">
        {phrases[0]}
      </span>

      {/* Outgoing Phrase: Slides UP smoothly (-115%) */}
      {animating && previous && (
        <span
          className="kinetic-phrase-gradient col-start-1 row-start-1 whitespace-nowrap will-change-transform py-1 leading-[1.25]"
          style={{
            animation: 'kineticWordRollUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {previous}
        </span>
      )}

      {/* Incoming Phrase: Rises from BOTTOM (115% -> 0%) */}
      <span
        className="kinetic-phrase-gradient col-start-1 row-start-1 whitespace-nowrap will-change-transform py-1 leading-[1.25]"
        style={animating ? {
          animation: 'kineticWordRollIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        } : undefined}
      >
        {current}
      </span>
    </span>
  );
}
