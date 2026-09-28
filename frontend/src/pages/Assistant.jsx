import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  Search,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { Badge, Banner, Button, Card, PageHeader, StatusPill, cx } from '../components/ui'
import AIOrbFace from '../components/AIOrbFace'
import { playClick } from '../utils/soundFx'
import { PageTourButton } from '../components/GuidedTour'
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  createSpeechRecognizer,
} from '../utils/speech'

const SESSIONS_STORAGE_KEY = 'swatva_assistant_sessions'
const ACTIVE_SESSION_STORAGE_KEY = 'swatva_assistant_active_session_id'
const MAX_SAVED_SESSIONS = 30
const OPENER_KEYS = ['0', '1', '2']

function loadStoredSessions() {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.warn('Failed to parse assistant sessions:', e)
    return []
  }
}

function saveStoredSessions(sessions) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SAVED_SESSIONS)))
  } catch (e) {
    console.warn('Failed to save assistant sessions:', e)
  }
}

function loadStoredActiveSessionId() {
  try {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function saveStoredActiveSessionId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
    }
  } catch {}
}

function formatSessionTime(timestamp, lang) {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 2) return lang === 'hi' ? 'अभी' : 'Just now'
    if (diffMins < 60) return lang === 'hi' ? `${diffMins} मिनट पहले` : `${diffMins}m ago`
    if (diffHours < 24) return lang === 'hi' ? `${diffHours} घंटे पहले` : `${diffHours}h ago`
    if (diffDays === 1) return lang === 'hi' ? 'कल' : 'Yesterday'

    return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function Assistant() {
  const { t, i18n } = useTranslation()
  const [sessions, setSessions] = useState(loadStoredSessions)
  const [activeSessionId, setActiveSessionId] = useState(loadStoredActiveSessionId)

  // Find initial messages from active session if present
  const [messages, setMessages] = useState(() => {
    const savedSessions = loadStoredSessions()
    const savedActiveId = loadStoredActiveSessionId()
    if (savedActiveId) {
      const active = savedSessions.find((s) => s.id === savedActiveId)
      if (active && Array.isArray(active.messages)) {
        return active.messages
      }
    }
    return []
  })

  const [text, setText] = useState('')
  const [sessionId, setSessionId] = useState(() => {
    const savedSessions = loadStoredSessions()
    const savedActiveId = loadStoredActiveSessionId()
    if (savedActiveId) {
      const active = savedSessions.find((s) => s.id === savedActiveId)
      return active?.backendSessionId || active?.id || null
    }
    return null
  })

  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sawUngrounded, setSawUngrounded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeSpeakingIndex, setActiveSpeakingIndex] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [voiceNotice, setVoiceNotice] = useState(null)

  // History Drawer & Fullscreen state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')

  const endRef = useRef(null)
  const inputRef = useRef(null)
  const recognizerRef = useRef(null)

  const sttAvailable = isSpeechRecognitionSupported()
  const ttsAvailable = isSpeechSynthesisSupported()

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
      if (recognizerRef.current) {
        recognizerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  // Stop TTS when user changes language
  useEffect(() => {
    stopSpeaking()
    setActiveSpeakingIndex(null)
  }, [i18n.resolvedLanguage])

  // Close drawer or exit fullscreen on ESC and lock body scroll
  useEffect(() => {
    if (isHistoryOpen || isFullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else if (isHistoryOpen) {
          setIsHistoryOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isHistoryOpen, isFullscreen])

  // Sync active session changes to stored sessions
  const updateSessionInStorage = useCallback((currentSessionId, updatedMessages, newBackendSessionId, ungrounded) => {
    if (!currentSessionId || updatedMessages.length === 0) return

    setSessions((prevSessions) => {
      const firstUserMsg = updatedMessages.find((m) => m.role === 'user')
      const rawTitle = firstUserMsg ? firstUserMsg.content : t('assistant.badge')
      const title = rawTitle.length > 55 ? `${rawTitle.slice(0, 52)}…` : rawTitle

      const existingIndex = prevSessions.findIndex((s) => s.id === currentSessionId)
      let updatedList
      const now = Date.now()

      if (existingIndex >= 0) {
        const existing = prevSessions[existingIndex]
        const updatedItem = {
          ...existing,
          title: existing.title || title,
          messages: updatedMessages,
          backendSessionId: newBackendSessionId || existing.backendSessionId || currentSessionId,
          sawUngrounded: ungrounded ?? existing.sawUngrounded,
          updatedAt: now,
        }
        updatedList = [updatedItem, ...prevSessions.filter((s) => s.id !== currentSessionId)]
      } else {
        const newItem = {
          id: currentSessionId,
          title,
          messages: updatedMessages,
          backendSessionId: newBackendSessionId || currentSessionId,
          sawUngrounded: ungrounded || false,
          createdAt: now,
          updatedAt: now,
          language: i18n.resolvedLanguage,
        }
        updatedList = [newItem, ...prevSessions]
      }

      saveStoredSessions(updatedList)
      return updatedList
    })
  }, [i18n.resolvedLanguage, t])

  const handleToggleSpeak = useCallback((index, content) => {
    playClick()
    if (activeSpeakingIndex === index) {
      stopSpeaking()
      setActiveSpeakingIndex(null)
      return
    }

    stopSpeaking()
    setActiveSpeakingIndex(index)
    speakText(content, i18n.resolvedLanguage, {
      onStart: () => setActiveSpeakingIndex(index),
      onEnd: () => setActiveSpeakingIndex(null),
      onError: () => setActiveSpeakingIndex(null),
    })
  }, [activeSpeakingIndex, i18n.resolvedLanguage])

  const handleNewChat = () => {
    playClick()
    stopSpeaking()
    setActiveSpeakingIndex(null)
    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop()
      setIsListening(false)
    }
    setMessages([])
    setSessionId(null)
    setActiveSessionId(null)
    saveStoredActiveSessionId(null)
    setSawUngrounded(false)
    setError(null)
    setIsHistoryOpen(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleSelectSession = (session) => {
    playClick()
    stopSpeaking()
    setActiveSpeakingIndex(null)
    setActiveSessionId(session.id)
    saveStoredActiveSessionId(session.id)
    setSessionId(session.backendSessionId || session.id)
    setMessages(session.messages || [])
    setSawUngrounded(Boolean(session.sawUngrounded))
    setError(null)
    setIsHistoryOpen(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleDeleteSession = (e, targetSessionId) => {
    e.stopPropagation()
    playClick()
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== targetSessionId)
      saveStoredSessions(filtered)
      return filtered
    })

    if (activeSessionId === targetSessionId) {
      setActiveSessionId(null)
      saveStoredActiveSessionId(null)
      setMessages([])
      setSessionId(null)
      setSawUngrounded(false)
    }
  }

  const handleClearAllHistory = () => {
    playClick()
    if (window.confirm(t('assistant.confirmClear'))) {
      setSessions([])
      saveStoredSessions([])
      setActiveSessionId(null)
      saveStoredActiveSessionId(null)
      setMessages([])
      setSessionId(null)
      setSawUngrounded(false)
      setIsHistoryOpen(false)
    }
  }

  const handleCopy = (index, textToCopy) => {
    if (!textToCopy) return
    playClick()
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    }).catch((err) => {
      console.warn('Failed to copy to clipboard:', err)
    })
  }

  const handleExportChat = () => {
    if (messages.length === 0) return
    playClick()
    const title = 'SWATVA Welfare Assistant - Consultation Export'
    const dateStr = new Date().toLocaleString(i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN')
    let markdown = `# ${title}\n*Export Date: ${dateStr}*\n\n---\n\n`

    messages.forEach((m, idx) => {
      const isUser = m.role === 'user'
      const speaker = isUser ? '👤 Citizen / User' : '🤖 SWATVA Welfare Assistant'
      markdown += `### ${idx + 1}. ${speaker}\n\n${m.content}\n\n`

      if (m.readiness) {
        markdown += `> **Application Readiness:** ${m.readiness.readinessPercentage}% (${m.readiness.completedDocuments}/${m.readiness.totalRequired} documents ready)\n\n`
      }

      if (m.benefits && m.benefits.length > 0) {
        markdown += `**Matched Schemes Surfaced:**\n`
        m.benefits.forEach((b) => {
          markdown += `- **${b.schemeName}** (${b.matchStatus}, ${b.matchPercentage}% match)${b.officialSourceUrl ? ` - [Official Portal](${b.officialSourceUrl})` : ''}\n`
        })
        markdown += '\n'
      }

      if (m.citations && m.citations.length > 0) {
        markdown += `*Official Sources / Citations:* ${m.citations.join(' · ')}\n\n`
      }

      markdown += '---\n\n'
    })

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `swatva-consultation-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const send = async (raw) => {
    const message = (raw ?? text).trim()
    if (!message || sending) return
    playClick()
    stopSpeaking()
    setActiveSpeakingIndex(null)
    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop()
      setIsListening(false)
    }
    setError(null)
    setText('')

    // Ensure we have an active session identifier
    let currentActiveId = activeSessionId
    if (!currentActiveId) {
      currentActiveId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      setActiveSessionId(currentActiveId)
      saveStoredActiveSessionId(currentActiveId)
    }

    const nextMessages = [...messages, { role: 'user', content: message }]
    setMessages(nextMessages)
    updateSessionInStorage(currentActiveId, nextMessages, sessionId, sawUngrounded)
    setSending(true)

    try {
      const res = await api.chat.send(message, sessionId, i18n.resolvedLanguage)
      const backendId = res?.sessionId || sessionId
      if (backendId) setSessionId(backendId)

      const isUngrounded = res?.grounded === false
      if (isUngrounded) setSawUngrounded(true)
      const assistantReply = res?.reply ?? t('assistant.failedBody')

      const finalMessages = [
        ...nextMessages,
        {
          role: 'assistant',
          content: assistantReply,
          grounded: res?.grounded,
          citations: res?.citations ?? [],
          benefits: res?.surfacedBenefits ?? [],
          readiness: res?.readinessScore,
        },
      ]

      setMessages(finalMessages)
      updateSessionInStorage(currentActiveId, finalMessages, backendId, isUngrounded || sawUngrounded)

      // Auto-readout if explicitly enabled by user in Preferences
      const autoTts = typeof window !== 'undefined' && localStorage.getItem('swatva_sound_tts') === 'on'
      if (autoTts && ttsAvailable) {
        setTimeout(() => {
          handleToggleSpeak(finalMessages.length - 1, assistantReply)
        }, 200)
      }
    } catch (err) {
      setError(err?.message || t('assistant.errorBody'))
      const errorMessages = [
        ...nextMessages,
        { role: 'assistant', content: t('assistant.failedBody'), error: true },
      ]
      setMessages(errorMessages)
      updateSessionInStorage(currentActiveId, errorMessages, sessionId, sawUngrounded)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleToggleListening = () => {
    playClick()
    if (!sttAvailable) {
      setVoiceNotice(t('assistant.voiceNotSupported'))
      setTimeout(() => setVoiceNotice(null), 4000)
      return
    }

    if (isListening) {
      if (recognizerRef.current) {
        recognizerRef.current.stop()
      }
      setIsListening(false)
      return
    }

    try {
      const recognizer = createSpeechRecognizer({
        appLang: i18n.resolvedLanguage,
        onStart: () => {
          setIsListening(true)
          setVoiceNotice(t('assistant.voiceListening'))
        },
        onInterim: (interim) => {
          setText(interim)
        },
        onResult: (final) => {
          setText(final)
          setVoiceNotice(t('assistant.voiceListening') || 'Listening… Speak now')
          // With continuous=true, don't stop — let user explicitly click MicOff
        },
        onError: (e) => {
          console.warn('Speech recognition error:', e)
          setIsListening(false)
          setVoiceNotice(null)
        },
        onEnd: () => {
          setIsListening(false)
          setVoiceNotice(null)
        },
      })

      recognizerRef.current = recognizer
      recognizer.start()
    } catch (err) {
      console.warn('Speech recognition init error:', err)
      setIsListening(false)
      setVoiceNotice(null)
    }
  }

  const filteredSessions = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((s) => {
      const inTitle = s.title?.toLowerCase().includes(q)
      const inMessages = s.messages?.some((m) => m.content?.toLowerCase().includes(q))
      return inTitle || inMessages
    })
  }, [sessions, historySearch])

  return (
    <div
      className={cx(
        'w-full transition-all duration-300',
        isFullscreen
          ? 'fixed inset-0 z-[9000] p-4 sm:p-6 bg-porcelain dark:bg-obsidian flex flex-col h-dvh max-h-dvh overflow-hidden'
          : 'flex flex-col h-[calc(100dvh-13.5rem)] lg:h-[calc(100dvh-14rem)] max-h-[calc(100dvh-13.5rem)] min-h-[440px] relative overflow-hidden'
      )}
    >
      <PageHeader
        title={t('assistant.title')}
        desc={t('assistant.desc')}
        className="mb-4 shrink-0"
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <PageTourButton pageKey="assistant" />
            <div data-tour="assistant-actions" className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                aria-label={t('assistant.newChat')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:opacity-90 transition-all duration-200 cursor-pointer select-none shadow-xs"
              >
                <Plus size={13} />
                <span>{t('assistant.newChat')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick()
                  setIsHistoryOpen((prev) => !prev)
                }}
                aria-label={t('assistant.historyButton')}
                className={cx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none',
                  isHistoryOpen
                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-xs'
                    : 'border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300'
                )}
              >
                <Clock size={13} />
                <span>{t('assistant.historyButton')}</span>
                {sessions.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 dark:bg-white/15 text-neutral-900 dark:text-white font-mono font-medium">
                    {sessions.length}
                  </span>
                )}
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportChat}
                  aria-label={t('assistant.export')}
                  title={t('assistant.export')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-700 dark:text-neutral-200 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 cursor-pointer select-none shadow-xs"
                >
                  <Download size={13} />
                  <span>{t('assistant.export')}</span>
                </button>
              )}
            </div>
          </div>
        }
      />

      {error ? (
        <div className="mb-3 shrink-0">
          <Banner tone="error" title={t('assistant.errorTitle')}>{error}</Banner>
        </div>
      ) : null}

      <div
        data-tour="assistant-chat"
        className="flex-1 overflow-y-auto overflow-x-hidden rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-white/10 p-4 sm:p-6 md:p-8 bg-white/50 dark:bg-white/[0.02] relative min-h-0"
      >
        {/* Top-Right Sticky Fullscreen Toggle Button inside Chat Window */}
        <div className="sticky top-0 float-right z-20 -mr-1 -mt-1 ml-2 mb-2">
          <button
            type="button"
            onClick={() => {
              playClick()
              setIsFullscreen((prev) => !prev)
            }}
            aria-label={isFullscreen ? t('assistant.exitFullscreen') : t('assistant.fullscreen')}
            title={isFullscreen ? t('assistant.exitFullscreen') : t('assistant.fullscreen')}
            className="p-1.5 rounded-xl bg-white/85 dark:bg-[#18191c]/90 hover:bg-neutral-100 dark:hover:bg-white/15 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/90 dark:border-white/15 shadow-2xs backdrop-blur-md transition-all duration-150 cursor-pointer select-none active:scale-95 flex items-center justify-center"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <AIOrbFace size={76} state={sending ? 'thinking' : isListening ? 'listening' : 'idle'} className="mb-3" />
            <h3 className="mt-2 text-base font-bold tracking-tight">{t('assistant.emptyTitle')}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 max-w-sm text-balance">
              {t('assistant.emptyBody')}
            </p>
            <div className="mt-5 flex flex-col gap-2 w-full max-w-sm">
              {OPENER_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => send(t(`assistant.openers.${k}`))}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {t(`assistant.openers.${k}`)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-6">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end items-start gap-2 group">
                  <button
                    type="button"
                    onClick={() => handleCopy(i, m.content)}
                    aria-label={copiedIndex === i ? t('assistant.copied') : t('assistant.copy')}
                    title={copiedIndex === i ? t('assistant.copied') : t('assistant.copy')}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 mt-1 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-all duration-150 cursor-pointer select-none"
                  >
                    {copiedIndex === i ? (
                      <Check size={13} className="text-emerald-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-[15px] bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 break-words overflow-hidden shadow-xs leading-relaxed">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-3 sm:gap-3.5 max-w-[94%] group">
                  <AIOrbFace size={28} state={m.error ? 'error' : activeSpeakingIndex === i ? 'speaking' : 'done'} className="flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div
                      className={cx(
                        'relative rounded-2xl rounded-tl-sm px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden shadow-xs',
                        m.error
                          ? 'border border-amber-600/40 bg-amber-500/10'
                          : 'bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10',
                      )}
                    >
                      {m.content}

                      {/* Assistant Message Actions: Copy + TTS */}
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(i, m.content)}
                          aria-label={copiedIndex === i ? t('assistant.copied') : t('assistant.copy')}
                          title={copiedIndex === i ? t('assistant.copied') : t('assistant.copy')}
                          className={cx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none',
                            copiedIndex === i
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/35 font-semibold'
                              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 font-medium'
                          )}
                        >
                          {copiedIndex === i ? (
                            <>
                              <Check size={13} className="text-emerald-500" />
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{t('assistant.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span className="text-[11px]">{t('assistant.copy')}</span>
                            </>
                          )}
                        </button>

                        {/* TTS Speak / Stop Button for assistant message */}
                        {ttsAvailable && !m.error ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(i, m.content)}
                            aria-label={activeSpeakingIndex === i ? (t('assistant.voiceStop') || 'Stop') : (t('assistant.voiceSpeak') || 'Read aloud')}
                            title={activeSpeakingIndex === i ? (t('assistant.voiceStop') || 'Stop') : (t('assistant.voiceSpeak') || 'Read aloud')}
                            className={cx(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all duration-200 cursor-pointer select-none',
                              activeSpeakingIndex === i
                                ? 'bg-amber-500/15 text-amber-950 dark:text-amber-200 border border-amber-500/35 shadow-xs ring-1 ring-amber-500/20 font-semibold'
                                : 'text-neutral-400 dark:text-neutral-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 font-medium'
                            )}
                          >
                            {activeSpeakingIndex === i ? (
                              <>
                                <span className="flex items-center gap-0.5 h-3 px-0.5" aria-hidden="true">
                                  <span className="w-0.5 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDuration: '600ms' }} />
                                  <span className="w-0.5 h-3 bg-amber-500 rounded-full animate-bounce" style={{ animationDuration: '450ms', animationDelay: '100ms' }} />
                                  <span className="w-0.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDuration: '700ms', animationDelay: '200ms' }} />
                                </span>
                                <VolumeX size={13} className="text-amber-600 dark:text-amber-400" />
                                <span className="text-[11px] font-semibold">{t('assistant.voiceStop') || 'Stop'}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={13} />
                                <span className="text-[11px]">{t('assistant.voiceSpeak') || 'Read aloud'}</span>
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {m.readiness ? (
                      <div className="mt-3">
                        <Card accent className="p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold">{t('assistant.readiness')}</span>
                            <span className="mono-badge text-amber-700 dark:text-amber-400">
                              {m.readiness.readinessPercentage}%
                            </span>
                          </div>
                          <div className="mt-2.5 h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${m.readiness.readinessPercentage}%` }} />
                          </div>
                          <p className="mt-2.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                            {t('assistant.docsReady', {
                              count: m.readiness.totalRequired,
                              done: m.readiness.completedDocuments,
                              total: m.readiness.totalRequired,
                            })}
                            {m.readiness.missingDocuments
                              ? t('assistant.docsMissing', {
                                  count: m.readiness.missingDocuments,
                                  n: m.readiness.missingDocuments,
                                })
                              : ''}
                          </p>
                        </Card>
                      </div>
                    ) : null}

                    {m.benefits?.length ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {m.benefits.map((b) => (
                          <Card key={b.schemeId} className="p-3.5 sm:p-4">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <StatusPill status={b.matchStatus} />
                              <span className="mono-badge text-neutral-400">{b.matchPercentage}%</span>
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-balance">{b.schemeName}</p>
                            {b.officialSourceUrl ? (
                              <a
                                href={b.officialSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                              >
                                Official source
                                <ExternalLink size={10} />
                              </a>
                            ) : null}
                          </Card>
                        ))}
                      </div>
                    ) : null}

                    {m.citations?.length ? (
                      <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                          {t('assistant.sourcesLabel') || 'Sources:'}
                        </span>
                        {m.citations.slice(0, 3).map((cite, ci) =>
                          cite.startsWith('http') ? (
                            <a
                              key={ci}
                              href={cite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-medium break-all px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-400/[0.08] border border-amber-500/20"
                            >
                              <span>{cite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                              <ExternalLink size={10} className="flex-shrink-0 ml-0.5" />
                            </a>
                          ) : (
                            <span key={ci} className="text-[11px] text-neutral-500 dark:text-neutral-400">{cite}</span>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
            {sending ? (
              <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                <AIOrbFace size={24} state="thinking" className="flex-shrink-0" />
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                  {t('assistant.thinking')}
                </span>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {voiceNotice ? (
        <div className="mt-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 dark:bg-amber-400/[0.08] backdrop-blur-md border border-amber-500/25 dark:border-amber-400/20 text-xs text-amber-950 dark:text-amber-200 flex items-center gap-2.5 shadow-xs animate-fade-in">
          <Mic size={14} className="text-amber-600 dark:text-amber-400 animate-pulse stroke-[2.2] flex-shrink-0" />
          <span className="font-medium">{voiceNotice}</span>
        </div>
      ) : null}

      {/* Active Audio Readout (TTS) Indicator Banner */}
      {activeSpeakingIndex !== null && !isListening && (
        <div className="mt-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 dark:bg-amber-400/[0.08] backdrop-blur-md border border-amber-500/25 dark:border-amber-400/20 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between shadow-xs animate-fade-in">
          <span className="flex items-center gap-2.5 font-medium">
            <Volume2 size={15} className="text-amber-600 dark:text-amber-400 animate-pulse stroke-[2.2] flex-shrink-0" />
            <span className="font-semibold">{t('assistant.voiceReadingAloud') || 'Reading aloud…'}</span>
          </span>
          <button
            type="button"
            onClick={() => { playClick(); stopSpeaking(); setActiveSpeakingIndex(null); }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 dark:bg-amber-400/20 dark:hover:bg-amber-400/30 text-amber-950 dark:text-amber-100 border border-amber-500/30 dark:border-amber-400/25 transition-all duration-150 cursor-pointer active:scale-95"
          >
            {t('assistant.voiceStopReadout') || 'Stop audio readout'}
          </button>
        </div>
      )}

      <form
        data-tour="assistant-input"
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="mt-3.5 sm:mt-4 shrink-0 flex items-end gap-2.5 sm:gap-3"
      >
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          placeholder={isListening ? (t('assistant.voiceListening') || 'Listening… Speak now') : t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
          className={cx(
            'flex-1 resize-none rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-[15px] bg-white/70 dark:bg-white/[0.04] border transition-all duration-200 focus:outline-none max-h-36 min-h-[50px] sm:min-h-[52px] leading-relaxed',
            isListening
              ? 'border-amber-500 ring-2 ring-amber-500/25 bg-amber-500/[0.04] dark:bg-amber-400/[0.03] shadow-[0_0_12px_rgba(245,158,11,0.12)]'
              : 'border-neutral-300 dark:border-white/15 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/25'
          )}
        />

        {/* Microphone STT Button */}
        <button
          type="button"
          onClick={handleToggleListening}
          aria-label={t('assistant.voiceInput')}
          title={isListening ? (t('assistant.voiceStop') || 'Stop') : t('assistant.voiceInput')}
          className={cx(
            'h-[50px] w-[50px] sm:h-[52px] sm:w-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 select-none',
            isListening
              ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-obsidian scale-105 animate-pulse'
              : 'border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5 shadow-xs'
          )}
        >
          {isListening ? <MicOff size={19} className="font-bold" /> : <Mic size={19} />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label={t('assistant.send')}
          title={t('assistant.send')}
          className={cx(
            'h-[50px] w-[50px] sm:h-[52px] sm:w-[52px] rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 select-none cursor-pointer',
            text.trim() && !sending
              ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 active:scale-95'
              : 'border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/[0.04] text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
          )}
        >
          <Send size={17} className="stroke-[2.2]" />
        </button>
      </form>

      {/* History Slide-Over Drawer with smooth sliding transition Portalled to document.body */}
      {typeof document !== 'undefined' && createPortal(
        <div
          className={cx(
            'fixed inset-0 z-[100000] flex justify-end transition-all duration-300 pointer-events-none select-none',
            isHistoryOpen ? 'pointer-events-auto visible' : 'invisible delay-300'
          )}
          aria-hidden={!isHistoryOpen}
        >
          {/* Full Screen Viewport Backdrop */}
          <div
            className={cx(
              'fixed inset-0 bg-neutral-950/40 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out',
              isHistoryOpen ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => {
              playClick()
              setIsHistoryOpen(false)
            }}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className={cx(
              'relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#121316] border-l border-neutral-200 dark:border-white/10 shadow-2xl flex flex-col h-full z-10 overflow-hidden',
              'transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
              isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
                    {t('assistant.historyTitle')}
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {t('assistant.historyDesc')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick()
                  setIsHistoryOpen(false)
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-neutral-200/80 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.01] shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={t('assistant.searchHistory')}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-white/[0.06] border border-neutral-200 dark:border-white/10 focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 text-neutral-900 dark:text-white placeholder:text-neutral-400"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-0">
              {filteredSessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
                  <Clock size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    {historySearch ? t('assistant.noSearchResults') : t('assistant.noHistoryTitle')}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs text-balance">
                    {historySearch ? '' : t('assistant.noHistoryDesc')}
                  </p>
                </div>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = s.id === activeSessionId
                  const msgCount = s.messages?.length || 0
                  const lastMsg = s.messages?.[s.messages.length - 1]?.content || ''

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      className={cx(
                        'group relative rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer text-left',
                        isActive
                          ? 'bg-amber-500/[0.08] dark:bg-amber-400/[0.06] border-amber-500/40 shadow-xs ring-1 ring-amber-500/25'
                          : 'bg-white dark:bg-white/[0.03] border-neutral-200/80 dark:border-white/10 hover:border-amber-500/30 hover:bg-neutral-50 dark:hover:bg-white/[0.05]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-1 flex-1 pr-1">
                          {s.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-neutral-950">
                              {t('assistant.activeBadge')}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            title={t('assistant.deleteSession')}
                            aria-label={t('assistant.deleteSession')}
                            className="opacity-60 group-hover:opacity-100 p-1 text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {lastMsg && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                          {lastMsg}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 pt-1 border-t border-neutral-100 dark:border-white/5">
                        <span>{formatSessionTime(s.updatedAt || s.createdAt, i18n.resolvedLanguage)}</span>
                        <span>{t('assistant.messagesCount', { count: msgCount })}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {sessions.length > 0 && (
              <div className="p-3.5 border-t border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {sessions.length} {t('assistant.historyTitle').toLowerCase()}
                </span>
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>{t('assistant.clearHistory')}</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
