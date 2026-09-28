import React from 'react';

/**
 * AIOrbIcon - Outline SVG icon matching SWATVA's AI Assistant Orb.
 * Uses the exact signature droplet/leaf silhouette (rounded-[50%_50%_2px_50%])
 * with expressive eyes and welcoming smile from AIOrbFace.jsx.
 */
export default function AIOrbIcon({ size = 16, className = '', strokeWidth = 2, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Signature SWATVA AI Orb droplet outline (50% 50% 2px 50%) */}
      <path d="M 12 2.5 A 9.5 9.5 0 0 0 2.5 12 A 9.5 9.5 0 0 0 12 21.5 L 19.5 21.5 A 2 2 0 0 0 21.5 19.5 L 21.5 12 A 9.5 9.5 0 0 0 12 2.5 Z" />
      {/* AI Assistant Eyes (from AIOrbFace) */}
      <circle cx="9.2" cy="11.2" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11.2" r="1.3" fill="currentColor" stroke="none" />
      {/* AI Assistant Smile (from AIOrbFace) */}
      <path
        d="M 9.8 15 Q 12 17.2 14.2 15"
        strokeWidth={typeof strokeWidth === 'number' ? strokeWidth * 0.8 : 1.6}
        fill="none"
      />
    </svg>
  );
}
