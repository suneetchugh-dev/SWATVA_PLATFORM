import React from 'react';

/**
 * AIOrbIcon - Custom SVG Icon representing SWATVA's AI Orb Assistant.
 * Designed to seamlessly blend with Lucide icons (stroke-based, 24x24 viewBox).
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
      {/* Main AI Orb */}
      <circle cx="12" cy="12" r="8.5" />
      {/* Expressive AI Mascot Eyes */}
      <circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="1.1" fill="currentColor" stroke="none" />
      {/* Gentle Welcoming Smile */}
      <path d="M9.8 14.5a3 3 0 0 0 4.4 0" strokeWidth="1.6" />
      {/* Top-Right AI Sparkle Indicator */}
      <path d="M19 2.5v3M17.5 4h3" strokeWidth="1.5" />
    </svg>
  );
}
