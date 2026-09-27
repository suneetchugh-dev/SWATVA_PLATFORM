import React, { useState } from 'react';
import { playClick } from '../utils/soundFx';

/**
 * Minimalist Outline Theme Toggle (adapted from SAHNIRMAAN)
 * Refined circular frosted enclosure with subtle hairline outline and soft 360° spin physics.
 */
export default function ThemeToggle({ darkMode, toggleTheme, className = '' }) {
  const [rotation, setRotation] = useState(0);

  const handleClick = () => {
    setRotation(prev => prev + 360);
    playClick();
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-neutral-200/80 dark:border-white/20 bg-neutral-100/80 dark:bg-white/[0.06] hover:bg-neutral-200/70 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md focus:outline-none focus:ring-0 active:outline-none group ${className}`}
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle dark/light theme"
    >
      <div
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className="theme-toggle-dial flex items-center justify-center"
      >
        {darkMode ? (
          /* Minimalist Outline Sun Icon */
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-neutral-200 group-hover:text-white"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* Minimalist Outline Moon Icon */
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-neutral-700 group-hover:text-neutral-950"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
    </button>
  );
}
