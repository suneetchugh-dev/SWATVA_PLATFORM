import React from 'react';
import './LoadingLogo.css';

export default function LoadingLogo({ size = 'h-8 w-8', className = '' }) {
  return (
    <div className={`flex items-center justify-center ${size} ${className} flex-shrink-0`}>
      <svg
        viewBox="0 0 100 100"
        className={`logo-svg w-full h-full`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="50%"
          y="54%"
          fontSize="76"
          dominantBaseline="middle"
          textAnchor="middle"
          className="logo-text"
        >
          S
        </text>
      </svg>
    </div>
  );
}
