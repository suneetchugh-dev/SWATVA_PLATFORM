import React, { useState } from 'react';
import './LoadingLogo.css';

export default function LoadingLogo({ 
  size = 'h-8 w-8', 
  className = '',
  animate = true,
  loop = false,
  hoverable = true,
  delay = 0,
  duration = null
}) {
  const [playHover, setPlayHover] = useState(false);
  const [hasFinishedMount, setHasFinishedMount] = useState(!animate);

  const handleMouseEnter = () => {
    if (hoverable && !loop) {
      setPlayHover(true);
    }
  };

  const handleAnimationEnd = (e) => {
    if (e.animationName.includes('draw-and-fill')) {
      setPlayHover(false);
      setHasFinishedMount(true);
    }
  };

  let animationClass = 'logo-static';
  if (loop && animate) {
    animationClass = 'logo-animated-loop';
  } else if (playHover) {
    animationClass = 'logo-hover-active';
  } else if (!hasFinishedMount) {
    animationClass = 'logo-animated-once';
  }

  // Build inline styles for dynamic duration/delay
  const textStyle = {};
  if (animationClass.includes('animated') && !playHover) {
    if (delay > 0) textStyle.animationDelay = `${delay}ms`;
    if (duration > 0) textStyle.animationDuration = `${duration}s`;
  }

  return (
    <div 
      className={`flex items-center justify-center ${size} ${className} flex-shrink-0 ${hoverable ? 'cursor-pointer' : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      <svg
        viewBox="0 0 100 100"
        className="logo-svg w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="50%"
          y="54%"
          fontSize="76"
          dominantBaseline="middle"
          textAnchor="middle"
          className={`logo-text ${animationClass}`}
          onAnimationEnd={handleAnimationEnd}
          style={textStyle}
        >
          S
        </text>
      </svg>
    </div>
  );
}
