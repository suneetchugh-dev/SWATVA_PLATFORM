import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  FileStack,
  Scale,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playClick } from '../utils/soundFx';
import { api } from '../api/client';

const STORAGE_KEY = 'swatva_read_notifications';

export default function NotificationsPopover({ isOpen, onClose, onUnreadChange }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const popoverRef = useRef(null);

  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState([
    {
      id: 'notif-doc-aadhaar',
      type: 'critical',
      title: i18n.language === 'hi' ? 'दस्तावेज़ स्थिति: आधार कार्ड' : 'Document Status: Aadhaar Card',
      desc: i18n.language === 'hi' ? 'योजनाओं के स्वतः मिलान के लिए अपने आधार का विवरण सत्यापित करें।' : 'Verify your Aadhaar details in Document Locker for auto-eligibility evaluation.',
      time: i18n.language === 'hi' ? 'अभी' : 'Just now',
      link: '/app/documents',
      icon: FileStack,
    },
    {
      id: 'notif-scheme-matches',
      type: 'success',
      title: i18n.language === 'hi' ? 'नई योजनाएं उपलब्ध' : 'Potential Benefits Unlocked',
      desc: i18n.language === 'hi' ? 'PM-KISAN और अन्य केंद्रीय/राज्य योजनाओं के तहत वार्षिक लाभ जांचें।' : 'Check annual financial assistance under PM-KISAN and state welfare schemes.',
      time: i18n.language === 'hi' ? '1 घंटा पहले' : '1h ago',
      link: '/app/matches',
      icon: Scale,
    },
    {
      id: 'notif-profile-complete',
      type: 'high',
      title: i18n.language === 'hi' ? 'प्रोफ़ाइल पूर्णता' : 'Profile Completion',
      desc: i18n.language === 'hi' ? 'अधिकतम योजनाओं की सटीक पात्रता पाने के लिए अपनी आय व परिवार विवरण भरें।' : 'Fill your annual family income and occupation to refine scheme match accuracy.',
      time: i18n.language === 'hi' ? '1 दिन पहले' : '1d ago',
      link: '/app/profile',
      icon: UserCheck,
    },
    {
      id: 'notif-dbt-transparency',
      type: 'info',
      title: i18n.language === 'hi' ? 'पारदर्शिता एवं प्रत्यक्ष लाभ (DBT)' : 'DBT Transparency Notice',
      desc: i18n.language === 'hi' ? 'सरकारी योजनाओं के आवेदन पूर्णतः निःशुल्क हैं — बिचौलियों को पैसे न दें।' : 'All government scheme applications are 100% free with zero commission fees.',
      time: i18n.language === 'hi' ? '2 दिन पहले' : '2d ago',
      link: '/app/transparency',
      icon: ShieldCheck,
    }
  ]);

  // Sync unread count
  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  useEffect(() => {
    if (onUnreadChange) {
      onUnreadChange(unreadCount);
    }
  }, [unreadCount, onUnreadChange]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const markAsRead = (id, link) => {
    playClick();
    if (!readIds.includes(id)) {
      const next = [...readIds, id];
      setReadIds(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
    }
    if (link) {
      onClose();
      navigate(link);
    }
  };

  const markAllAsRead = () => {
    playClick();
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    } catch {}
  };

  const dismissNotification = (id) => {
    playClick();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Also mark as read in localStorage so it doesn't reappear on re-mount
    setReadIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearAll = () => {
    playClick();
    markAllAsRead();
    setNotifications([]);
  };

  if (!isOpen) return null;

  const getTypeIcon = (type, IconComp) => {
    switch (type) {
      case 'critical':
      case 'high':
        return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />;
      case 'success':
        return <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />;
      default:
        return IconComp ? (
          <IconComp size={14} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
        ) : (
          <Info size={14} className="text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
        );
    }
  };

  return (
    <div 
      ref={popoverRef}
      className="absolute right-0 top-11 w-[calc(100vw-1.5rem)] max-w-xs sm:max-w-none sm:w-96 rounded-2xl bg-white dark:bg-[#151618] border border-neutral-200 dark:border-white/10 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-white/5 bg-white dark:bg-[#151618]">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-lg bg-neutral-100 dark:bg-white/5 flex items-center justify-center">
            <Bell size={13} className="text-neutral-900 dark:text-white" />
          </div>
          <span className="text-xs font-bold text-neutral-900 dark:text-white">
            {i18n.language === 'hi' ? 'सूचनाएं एवं अलर्ट' : 'Notifications & Alerts'}
          </span>
          {unreadCount > 0 && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              title={i18n.language === 'hi' ? 'सभी को पढ़ा हुआ चिह्नित करें' : 'Mark all as read'}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <CheckCheck size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => { playClick(); onClose(); }}
            title={i18n.language === 'hi' ? 'बंद करें' : 'Close'}
            aria-label="Close notifications"
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5 custom-scrollbar bg-white dark:bg-[#151618]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#151618]">
            <ShieldCheck size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {i18n.language === 'hi' ? 'कोई नई सूचना नहीं है' : 'No new notifications'}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {i18n.language === 'hi' ? 'आपके दस्तावेज़ और योजनाएं अद्यतित हैं।' : 'All your documents and eligible schemes are up to date.'}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isRead = readIds.includes(notif.id);
            return (
              <div
                key={notif.id}
                className={`group/notif relative p-3.5 flex items-start space-x-3 transition cursor-pointer ${
                  isRead
                    ? 'opacity-70 hover:opacity-100 bg-white dark:bg-[#151618] hover:bg-neutral-50 dark:hover:bg-white/[0.04]'
                    : 'bg-neutral-50 dark:bg-[#121315] hover:bg-neutral-100 dark:hover:bg-[#1a1b1e]'
                }`}
                onClick={() => markAsRead(notif.id, notif.link)}
              >
                {getTypeIcon(notif.type, notif.icon)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold truncate ${isRead ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-950 dark:text-white'}`}>
                      {notif.title}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400 ml-2 whitespace-nowrap flex items-center gap-0.5">
                      <Clock size={10} /> {notif.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 leading-snug">
                    {notif.desc}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                  {!isRead && (
                    <Sparkles size={12} className="text-amber-600 dark:text-amber-400 mt-1 flex-shrink-0" />
                  )}
                  {/* Per-notification dismiss button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                    title={i18n.language === 'hi' ? 'हटाएं' : 'Dismiss'}
                    aria-label={i18n.language === 'hi' ? 'यह सूचना हटाएं' : 'Dismiss notification'}
                    className="opacity-0 group-hover/notif:opacity-100 focus:opacity-100 p-1 rounded-md text-neutral-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer mt-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 bg-neutral-50 dark:bg-[#101113] border-t border-neutral-100 dark:border-white/5 flex items-center justify-end px-3">
          <button
            type="button"
            onClick={clearAll}
            title={i18n.language === 'hi' ? 'सभी सूचनाएं हटाएं' : 'Clear all notifications'}
            aria-label="Clear all notifications"
            className="flex items-center gap-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-red-500/10 active:scale-95"
          >
            <Trash2 size={12} className="text-red-600 dark:text-red-400 stroke-[2.2]" />
            <span>{i18n.language === 'hi' ? 'सभी हटाएं' : 'Clear All'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
