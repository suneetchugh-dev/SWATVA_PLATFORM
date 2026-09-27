import React from 'react';

/**
 * Monochrome NotificationBadge Component
 * Displays clean notification counters and indicator dots with pulse animations.
 */
export default function NotificationBadge({
  count = 0,
  maxCount = 99,
  variant = 'count', // 'count' | 'dot' | 'status'
  position = 'top-right', // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  status = 'online', // 'online' | 'busy' | 'away' | 'offline'
  ping = false,
  showZero = false,
  className = '',
  badgeClassName = '',
  ariaLabel,
  children
}) {
  const isVisible = variant === 'count' 
    ? (showZero || count > 0)
    : true;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  const positionClasses = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  }[position] || '-top-1 -right-1';

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      {children}

      {isVisible && (
        <span
          className={`absolute ${positionClasses} flex items-center justify-center pointer-events-none z-10`}
          aria-label={ariaLabel || (variant === 'count' ? `${count} unread notifications` : 'New notification')}
        >
          {/* Subtle ping pulse ring */}
          {ping && (count > 0 || variant === 'dot') && (
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-neutral-950 dark:bg-white"
              aria-hidden="true"
            />
          )}

          {/* Badge count in pure monochrome */}
          {variant === 'count' && (
            <span
              className={`relative inline-flex items-center justify-center min-w-[10px] h-[10px] px-0.5 text-[6.5px] font-mono font-bold leading-none bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-full shadow-xs border border-white/20 dark:border-black/20 ${badgeClassName}`}
            >
              {displayCount}
            </span>
          )}

          {variant === 'dot' && (
            <span
              className={`relative inline-flex h-2 w-2 rounded-full bg-neutral-950 dark:bg-white shadow-xs border border-white dark:border-black ${badgeClassName}`}
            />
          )}

          {variant === 'status' && (
            <span
              className={`relative inline-flex h-2 w-2 rounded-full bg-neutral-950 dark:bg-white shadow-xs border border-white dark:border-[#080808] ${badgeClassName}`}
            />
          )}
        </span>
      )}
    </span>
  );
}
