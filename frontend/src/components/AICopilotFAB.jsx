import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  Send,
  Mic,
  MicOff,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Plus,
  Search,
  ExternalLink,
  MessageSquare,
  Sparkles,
  FileCheck,
} from 'lucide-react'
import AIOrbFace from './AIOrbFace'
import { api } from '../api/client'
import { playClick } from '../utils/soundFx'
import { cx, Badge, StatusPill } from './ui'
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

export default function AICopilotFAB() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isAssistantPage = location.pathname === '/app/assistant'

  const [isOpen, setIsOpen] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')

  const [sessions, setSessions] = useState(loadStoredSessions)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sessionId, setSessionId] = useState(null)

  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sawUngrounded, setSawUngrounded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeSpeakingIndex, setActiveSpeakingIndex] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [autoBadge, setAutoBadge] = useState(0)

  // Floating AI Orb FAB Draggable Position
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 })
  const [isOrbDragging, setIsOrbDragging] = useState(false)
  const orbDragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0, hasMoved: false })
  const currentOrbPosRef = useRef({ x: 0, y: 0 })
  const orbAnimationFrameRef = useRef(null)
  const orbRef = useRef(null)
  const orbHoldTimerRef = useRef(null)
  const isOrbMouseDownRef = useRef(false)

  // Draggable Chat Window Position
  const [windowPos, setWindowPos] = useState({ x: 0, y: 0 })
  const [isWindowDragging, setIsWindowDragging] = useState(false)
  const windowDragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 })
  const currentWindowPosRef = useRef({ x: 0, y: 0 })
  const windowAnimationFrameRef = useRef(null)
  const chatWindowRef = useRef(null)

  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const recognizerRef = useRef(null)
  const chatCloseTimerRef = useRef(null)

  const isHindi = i18n.language === 'hi' || i18n.language?.startsWith('hi')
  const sttAvailable = isSpeechRecognitionSupported()
  const ttsAvailable = isSpeechSynthesisSupported()

  // Scroll to bottom of message stream
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, sending])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setIsChatVisible(true)
      setTimeout(() => inputRef.current?.focus(), 160)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Stop speaking when language changes
  useEffect(() => {
    stopSpeaking()
    setActiveSpeakingIndex(null)
  }, [i18n.resolvedLanguage])

  // Storage Sync helper
  const updateSessionInStorage = useCallback((currentSessionId, updatedMessages, newBackendSessionId, ungrounded) => {
    if (!currentSessionId || updatedMessages.length === 0) return

    setSessions((prevSessions) => {
      const firstUserMsg = updatedMessages.find((m) => m.role === 'user')
      const rawTitle = firstUserMsg ? firstUserMsg.content : (isHindi ? 'कल्याण परामर्श' : 'Scheme Consultation')
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
  }, [i18n.resolvedLanguage, isHindi])

  // Audio TTS Speak
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

  // Handle Close
  const handleClose = () => {
    playClick()
    stopSpeaking()
    setActiveSpeakingIndex(null)
    if (isListening && recognizerRef.current) {
      recognizerRef.current.stop()
      setIsListening(false)
    }
    setIsHistoryOpen(false)
    setIsOpen(false)
    chatCloseTimerRef.current = window.setTimeout(() => setIsChatVisible(false), 280)
  }

  // Toggle Chat
  const toggleChat = () => {
    playClick()
    setIsOpen((prev) => {
      const next = !prev
      if (!next) {
        stopSpeaking()
        setActiveSpeakingIndex(null)
        if (isListening && recognizerRef.current) {
          recognizerRef.current.stop()
          setIsListening(false)
        }
        chatCloseTimerRef.current = window.setTimeout(() => setIsChatVisible(false), 280)
      } else {
        window.clearTimeout(chatCloseTimerRef.current)
        setIsChatVisible(true)
        setAutoBadge(0)
      }
      return next
    })
  }

  // New Chat
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

  // Select Session from History
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

  // Delete Session
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

  // Clear All History
  const handleClearAllHistory = () => {
    playClick()
    if (window.confirm(t('assistant.confirmClear') || 'Are you sure you want to clear all chat history?')) {
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

  // Copy Message
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

  // Send Message
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
      const assistantReply = res?.reply ?? (t('assistant.failedBody') || "I couldn't verify that with certainty against our welfare rules.")

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

      if (!isOpen) {
        setAutoBadge((prev) => prev + 1)
      }
    } catch (err) {
      setError(err?.message || (t('assistant.errorBody') || 'Unable to reach the assistant service.'))
      const errorMessages = [
        ...nextMessages,
        { role: 'assistant', content: t('assistant.failedBody') || "I couldn't verify that with certainty.", error: true },
      ]
      setMessages(errorMessages)
      updateSessionInStorage(currentActiveId, errorMessages, sessionId, sawUngrounded)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  // Voice recognition toggle
  const handleToggleListening = () => {
    playClick()
    if (!sttAvailable) return

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
        },
        onInterim: (interim) => {
          setText(interim)
        },
        onResult: (final) => {
          setText(final)
        },
        onError: () => {
          setIsListening(false)
        },
        onEnd: () => {
          setIsListening(false)
        },
      })

      if (recognizer) {
        recognizerRef.current = recognizer
        recognizer.start()
      }
    } catch (e) {
      console.warn('Speech recognition start failed:', e)
      setIsListening(false)
    }
  }

  // Draggable FAB Handlers (Mouse + Touch)
  const handleOrbMouseDown = (e) => {
    isOrbMouseDownRef.current = true
    orbDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: orbPosition.x,
      startY: orbPosition.y,
      hasMoved: false,
    }
    currentOrbPosRef.current = { x: orbPosition.x, y: orbPosition.y }

    orbHoldTimerRef.current = setTimeout(() => {
      if (isOrbMouseDownRef.current) {
        setIsOrbDragging(true)
      }
    }, 180)
  }

  const handleOrbTouchStart = (e) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    isOrbMouseDownRef.current = true
    orbDragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      startX: orbPosition.x,
      startY: orbPosition.y,
      hasMoved: false,
    }
    currentOrbPosRef.current = { x: orbPosition.x, y: orbPosition.y }

    orbHoldTimerRef.current = setTimeout(() => {
      if (isOrbMouseDownRef.current) {
        setIsOrbDragging(true)
      }
    }, 180)
  }

  useEffect(() => {
    const handlePointerMove = (clientX, clientY) => {
      if (!isOrbMouseDownRef.current) return
      const deltaX = clientX - orbDragStartRef.current.mouseX
      const deltaY = clientY - orbDragStartRef.current.mouseY
      const dist = Math.hypot(deltaX, deltaY)

      if (dist > 6) {
        orbDragStartRef.current.hasMoved = true
        if (!isOrbDragging) {
          if (orbHoldTimerRef.current) clearTimeout(orbHoldTimerRef.current)
          setIsOrbDragging(true)
        }
      }

      if (isOrbDragging) {
        const minX = -(window.innerWidth - 72)
        const maxX = 16
        const minY = -(window.innerHeight - 100)
        const maxY = 16
        const clampedX = Math.min(Math.max(orbDragStartRef.current.startX + deltaX, minX), maxX)
        const clampedY = Math.min(Math.max(orbDragStartRef.current.startY + deltaY, minY), maxY)
        currentOrbPosRef.current = { x: clampedX, y: clampedY }

        if (!orbAnimationFrameRef.current) {
          orbAnimationFrameRef.current = requestAnimationFrame(() => {
            if (orbRef.current) {
              orbRef.current.style.transform = `translate3d(${currentOrbPosRef.current.x}px, ${currentOrbPosRef.current.y}px, 0)`
            }
            orbAnimationFrameRef.current = null
          })
        }
      }
    }

    const handleMouseMove = (e) => handlePointerMove(e.clientX, e.clientY)
    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handlePointerUp = () => {
      if (!isOrbMouseDownRef.current) return
      isOrbMouseDownRef.current = false
      if (orbHoldTimerRef.current) {
        clearTimeout(orbHoldTimerRef.current)
        orbHoldTimerRef.current = null
      }
      if (orbAnimationFrameRef.current) {
        cancelAnimationFrame(orbAnimationFrameRef.current)
        orbAnimationFrameRef.current = null
      }
      if (isOrbDragging) {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setIsOrbDragging(false)
        setOrbPosition({ x: currentOrbPosRef.current.x, y: currentOrbPosRef.current.y })
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [isOrbDragging])

  // Window Dragging Handlers (Mouse + Touch)
  const handleWindowMouseDown = (e) => {
    if (isFullscreen) return
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return
    e.preventDefault()
    setIsWindowDragging(true)
    windowDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: windowPos.x,
      startY: windowPos.y,
    }
    currentWindowPosRef.current = { x: windowPos.x, y: windowPos.y }
  }

  const handleWindowTouchStart = (e) => {
    if (isFullscreen || e.touches.length !== 1) return
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return
    const touch = e.touches[0]
    setIsWindowDragging(true)
    windowDragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      startX: windowPos.x,
      startY: windowPos.y,
    }
    currentWindowPosRef.current = { x: windowPos.x, y: windowPos.y }
  }

  useEffect(() => {
    if (!isWindowDragging) return

    const handlePointerMove = (clientX, clientY) => {
      const deltaX = clientX - windowDragStartRef.current.mouseX
      const deltaY = clientY - windowDragStartRef.current.mouseY

      const minX = -(window.innerWidth - 360)
      const maxX = 30
      const minY = -(window.innerHeight - 200)
      const maxY = 40
      const clampedX = Math.min(Math.max(windowDragStartRef.current.startX + deltaX, minX), maxX)
      const clampedY = Math.min(Math.max(windowDragStartRef.current.startY + deltaY, minY), maxY)
      currentWindowPosRef.current = { x: clampedX, y: clampedY }

      if (!windowAnimationFrameRef.current) {
        windowAnimationFrameRef.current = requestAnimationFrame(() => {
          if (chatWindowRef.current && !isFullscreen) {
            chatWindowRef.current.style.transform = `translate3d(${currentWindowPosRef.current.x}px, ${currentWindowPosRef.current.y}px, 0)`
          }
          windowAnimationFrameRef.current = null
        })
      }
    }

    const handleMouseMove = (e) => handlePointerMove(e.clientX, e.clientY)
    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handlePointerUp = () => {
      if (windowAnimationFrameRef.current) {
        cancelAnimationFrame(windowAnimationFrameRef.current)
        windowAnimationFrameRef.current = null
      }
      setIsWindowDragging(false)
      setWindowPos({ x: currentWindowPosRef.current.x, y: currentWindowPosRef.current.y })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)
    return () => {
      if (windowAnimationFrameRef.current) {
        cancelAnimationFrame(windowAnimationFrameRef.current)
        windowAnimationFrameRef.current = null
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [isWindowDragging, isFullscreen])

  const handleOrbClick = (e) => {
    if (orbDragStartRef.current.hasMoved) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    toggleChat()
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

  // Do not render the floating duplicate FAB if already on the dedicated full-page Assistant
  if (isAssistantPage) {
    return null
  }

  const aiOrbState = sending ? 'thinking' : isListening ? 'listening' : activeSpeakingIndex !== null ? 'speaking' : 'idle'

  return (
    <>
      {/* Draggable Floating AI Orb FAB */}
      <aside
        ref={orbRef}
        aria-label={t('assistant.title') || 'SWATVA Welfare Assistant'}
        className="fixed bottom-24 lg:bottom-8 right-5 sm:right-7 z-[9990] select-none touch-manipulation"
        style={{
          transform: `translate3d(${orbPosition.x}px, ${orbPosition.y}px, 0)`,
          willChange: isOrbDragging ? 'transform' : 'auto',
          transition: isOrbDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          type="button"
          onMouseDown={handleOrbMouseDown}
          onTouchStart={handleOrbTouchStart}
          onClick={handleOrbClick}
          aria-label={isOpen ? (t('common.close') || 'Close') : (t('assistant.title') || 'Open AI Assistant')}
          title={isOpen ? (t('common.close') || 'Close') : (isHindi ? 'स्वतवा कल्याण सहायक खोलें' : 'Open SWATVA Assistant')}
          className={`group relative flex items-center justify-center p-1.5 rounded-full transition-transform duration-500 ease-out focus:outline-none ${
            isOrbDragging ? 'cursor-grabbing scale-105' : 'cursor-pointer hover:scale-110 active:scale-95'
          }`}
        >
          {/* Soft Amber Glow Halo in Light & Dark Theme */}
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-2 rounded-full bg-amber-500/25 dark:bg-amber-500/40 blur-lg scale-100 pointer-events-none transition-all duration-500 ease-out group-hover:bg-amber-500/45 dark:group-hover:bg-amber-500/65 group-hover:blur-xl group-hover:scale-120"
          />

          {/* Interactive AI Orb Face with Live Gaze Tracking */}
          <div className="relative z-10 flex items-center justify-center pointer-events-none">
            <AIOrbFace size={44} state={aiOrbState} gaze={true} />

            {/* Unread Response Badge */}
            {!isOpen && autoBadge > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold leading-none bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border border-neutral-200 dark:border-white/20 shadow-md animate-bounce"
                aria-label={`${autoBadge} unread response`}
              >
                {autoBadge > 9 ? '9+' : autoBadge}
              </span>
            )}
          </div>
        </button>
      </aside>

      {/* Expandable Neo-Glass Floating Chat Window */}
      {isChatVisible && (
        <div
          ref={chatWindowRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('assistant.title') || 'SWATVA Welfare Assistant'}
          style={{
            transform: isFullscreen ? 'none' : `translate3d(${windowPos.x}px, ${windowPos.y}px, 0)`,
            willChange: isWindowDragging ? 'transform' : 'auto',
            transition: isWindowDragging ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out',
          }}
          className={cx(
            'fixed z-[9995] flex flex-col overflow-hidden backdrop-blur-2xl bg-white/95 dark:bg-[#0c0c10]/95 border border-neutral-200/80 dark:border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]',
            isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none',
            isFullscreen
              ? 'inset-0 rounded-none w-full h-full'
              : 'bottom-24 lg:bottom-8 right-4 sm:right-7 w-[calc(100vw-2rem)] sm:w-[440px] md:w-[460px] h-[calc(100dvh-7.5rem)] sm:h-[580px] max-h-[620px] rounded-3xl'
          )}
        >
          {/* Header Bar (Draggable) */}
          <div
            onMouseDown={handleWindowMouseDown}
            onTouchStart={handleWindowTouchStart}
            className={cx(
              'flex items-center justify-between px-4 py-3 border-b border-neutral-200/70 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] shrink-0 select-none',
              !isFullscreen && (isWindowDragging ? 'cursor-grabbing' : 'cursor-grab')
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -m-1 rounded-full bg-amber-500/25 blur-md pointer-events-none"
                />
                <AIOrbFace size={26} state={aiOrbState} gaze={false} className="relative z-10" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold tracking-tight text-neutral-950 dark:text-white truncate">
                  {t('assistant.title') || 'SWATVA Assistant'}
                </h3>
                <p className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                  {isHindi ? 'स्वतवा कल्याण सहायक' : 'Vernacular Welfare RAG'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Monochromatic Button to open full Assistant page */}
              <button
                type="button"
                onClick={() => {
                  playClick()
                  handleClose()
                  navigate('/app/assistant')
                }}
                aria-label={isHindi ? 'पूर्ण पृष्ठ पर जाएं' : 'Open Full Assistant Page'}
                title={isHindi ? 'पूर्ण पृष्ठ पर जारी रखें' : 'Continue in Assistant Page'}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold border border-neutral-300 dark:border-white/15 bg-neutral-100/90 dark:bg-white/[0.06] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-950 hover:text-white dark:hover:bg-white dark:hover:text-neutral-950 dark:hover:border-white transition-all duration-200 shadow-2xs cursor-pointer select-none active:scale-95 mr-1"
              >
                <ExternalLink size={11} className="shrink-0" />
                <span className="hidden sm:inline">{isHindi ? 'पूर्ण पृष्ठ' : 'Full Page'}</span>
              </button>

              <button
                type="button"
                onClick={handleNewChat}
                aria-label={t('assistant.newChat') || 'New Chat'}
                title={t('assistant.newChat') || 'New Chat'}
                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Plus size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick()
                  setIsHistoryOpen((prev) => !prev)
                }}
                aria-label={t('assistant.historyButton') || 'History'}
                title={t('assistant.historyButton') || 'History'}
                className={cx(
                  'p-1.5 rounded-lg transition-colors cursor-pointer',
                  isHistoryOpen
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10'
                )}
              >
                <Clock size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick()
                  setIsFullscreen((prev) => !prev)
                }}
                aria-label={isFullscreen ? (t('assistant.exitFullscreen') || 'Exit Fullscreen') : (t('assistant.fullscreen') || 'Fullscreen')}
                title={isFullscreen ? (t('assistant.exitFullscreen') || 'Exit Fullscreen') : (t('assistant.fullscreen') || 'Fullscreen')}
                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer hidden sm:inline-flex"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label={t('common.close') || 'Close'}
                title={t('common.close') || 'Close'}
                className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* History Slide-over Drawer */}
          {isHistoryOpen && (
            <div className="absolute inset-0 top-[49px] z-30 bg-white/98 dark:bg-[#0c0c10]/98 backdrop-blur-xl flex flex-col p-4 animate-in fade-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-white/10 gap-2">
                <span className="text-xs font-bold tracking-tight text-neutral-950 dark:text-white flex items-center gap-1.5 min-w-0 truncate">
                  <Clock size={13} className="text-amber-500 shrink-0" />
                  <span className="truncate">{t('assistant.historyTitle') || 'Past Consultations'}</span>
                </span>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    aria-label={t('assistant.clearHistory') || 'Clear all'}
                    title={t('assistant.clearHistory') || 'Clear all'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 bg-neutral-100 dark:bg-white/5 hover:bg-red-500/10 border border-neutral-200/80 dark:border-white/10 hover:border-red-500/30 transition-all cursor-pointer select-none active:scale-95 shrink-0"
                  >
                    <Trash2 size={11} className="stroke-[2.2] text-red-500/80 dark:text-red-400/80" />
                    <span>{t('assistant.clearHistory') || 'Clear all'}</span>
                  </button>
                )}
              </div>

              {sessions.length > 0 && (
                <div className="relative my-2.5 shrink-0">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder={t('assistant.searchHistory') || 'Search consultations…'}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 text-neutral-900 dark:text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-1 min-h-0">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-xs font-mono">
                    {sessions.length === 0
                      ? (t('assistant.noHistoryTitle') || 'No past consultations yet')
                      : (t('assistant.noSearchResults') || 'No matching conversations')}
                  </div>
                ) : (
                  filteredSessions.map((s) => {
                    const isActive = s.id === activeSessionId
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectSession(s)}
                        className={cx(
                          'group flex items-start justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all text-left text-xs border',
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/40 text-neutral-950 dark:text-white'
                            : 'bg-neutral-50 dark:bg-white/[0.03] border-neutral-200/60 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-white/20'
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{s.title}</p>
                          <span className="text-[10px] font-mono text-neutral-400 mt-0.5 block">
                            {formatSessionTime(s.updatedAt, i18n.resolvedLanguage)} · {s.messages?.length || 0} msgs
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          aria-label={t('assistant.deleteSession') || 'Delete'}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {sessions.length > 0 && (
                <div className="pt-2.5 mt-2 border-t border-neutral-200 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                    {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                  </span>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                    {t('assistant.historySubtitle') || 'Saved locally'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Main Message Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6">
                <div className="relative mb-3 flex items-center justify-center group cursor-default">
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -m-3 rounded-full bg-amber-500/22 dark:bg-amber-500/35 blur-xl scale-100 pointer-events-none transition-all duration-500 ease-out group-hover:bg-amber-500/45 dark:group-hover:bg-amber-500/60 group-hover:blur-2xl group-hover:scale-120"
                  />
                  <AIOrbFace size={58} state={aiOrbState} className="relative z-10 transition-transform duration-500 ease-out group-hover:scale-105" />
                </div>
                <h4 className="text-sm font-bold tracking-tight text-neutral-950 dark:text-white">
                  {t('assistant.emptyTitle') || 'Ask anything about your benefits'}
                </h4>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs text-balance">
                  {t('assistant.emptyBody') || 'Ask about eligibility, documents, or how schemes match your profile.'}
                </p>

                <div className="mt-4 flex flex-col gap-1.5 w-full max-w-xs">
                  {OPENER_KEYS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => send(t(`assistant.openers.${k}`))}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/[0.05] hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                    >
                      {t(`assistant.openers.${k}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end items-start gap-1.5 group">
                    <button
                      type="button"
                      onClick={() => handleCopy(i, m.content)}
                      aria-label={copiedIndex === i ? (t('assistant.copied') || 'Copied!') : (t('assistant.copy') || 'Copy')}
                      className="opacity-0 group-hover:opacity-100 p-1 mt-0.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-opacity cursor-pointer"
                    >
                      {copiedIndex === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                    <div className="max-w-[85%] rounded-2xl rounded-br-xs px-3.5 py-2.5 text-xs bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 break-words leading-relaxed shadow-xs">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2.5 max-w-[94%] group">
                    <AIOrbFace size={24} state={m.error ? 'error' : activeSpeakingIndex === i ? 'speaking' : 'done'} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cx(
                          'rounded-2xl rounded-tl-xs p-3.5 text-xs leading-relaxed break-words border',
                          m.error
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-neutral-100/90 dark:bg-white/[0.05] border-neutral-200/70 dark:border-white/10 text-neutral-900 dark:text-neutral-100'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        {/* Surfaced Benefits Card */}
                        {m.benefits && m.benefits.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-200/60 dark:border-white/10 space-y-1.5">
                            {m.benefits.map((b, bIdx) => (
                              <div key={bIdx} className="p-2 rounded-lg bg-white/80 dark:bg-white/5 border border-neutral-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                                <span className="font-semibold text-[11px] truncate">{b.schemeName}</span>
                                {b.matchPercentage && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
                                    {b.matchPercentage}% match
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Readiness Score */}
                        {m.readiness && (
                          <div className="mt-2 pt-2 border-t border-neutral-200/60 dark:border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            <FileCheck size={12} className="text-emerald-500 shrink-0" />
                            <span>Readiness: {m.readiness.readinessPercentage}% ({m.readiness.completedDocuments}/{m.readiness.totalRequired} docs ready)</span>
                          </div>
                        )}
                      </div>

                      {/* Action Bar (Copy & TTS) */}
                      {!m.error && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(i, m.content)}
                            aria-label={copiedIndex === i ? (t('assistant.copied') || 'Copied!') : (t('assistant.copy') || 'Copy')}
                            className="text-[10px] font-mono text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === i ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copiedIndex === i ? (t('assistant.copied') || 'Copied') : (t('assistant.copy') || 'Copy')}</span>
                          </button>

                          {ttsAvailable && (
                            <button
                              type="button"
                              onClick={() => handleToggleSpeak(i, m.content)}
                              aria-label={activeSpeakingIndex === i ? (t('assistant.voiceStop') || 'Stop') : (t('assistant.voiceSpeak') || 'Read')}
                              className="text-[10px] font-mono text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                            >
                              {activeSpeakingIndex === i ? (
                                <VolumeX size={11} className="text-amber-500 animate-pulse" />
                              ) : (
                                <Volume2 size={11} />
                              )}
                              <span>{activeSpeakingIndex === i ? (t('assistant.voiceStop') || 'Stop') : (t('assistant.voiceSpeak') || 'Read')}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )
            )}

            {sending && (
              <div className="flex items-center gap-2.5 text-xs text-neutral-400 font-mono">
                <AIOrbFace size={22} state="thinking" className="shrink-0" />
                <span className="animate-pulse">{t('assistant.thinking') || 'Thinking…'}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="px-3.5 py-1.5 text-[11px] bg-red-500/10 text-red-600 dark:text-red-400 text-center border-t border-red-500/20">
              {error}
            </div>
          )}

          {/* Input Form Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="p-2.5 sm:p-3 border-t border-neutral-200/70 dark:border-white/10 bg-neutral-50/70 dark:bg-white/[0.02] shrink-0 flex items-center gap-2"
          >
            <div
              className={cx(
                'flex-1 flex items-center rounded-2xl border transition-all duration-200 px-3.5 py-2.5 shadow-2xs min-h-[44px]',
                isListening
                  ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/[0.04] dark:bg-amber-400/[0.03] shadow-[0_0_14px_rgba(245,158,11,0.18)]'
                  : 'border-neutral-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.04] focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:shadow-[0_0_12px_rgba(245,158,11,0.12)]'
              )}
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isListening ? (t('assistant.voiceListening') || 'Listening… Speak now') : (t('assistant.placeholder') || 'Ask about your schemes…')}
                disabled={sending}
                className="w-full bg-transparent text-xs sm:text-[13px] text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none border-none focus:ring-0 leading-relaxed"
              />
            </div>

            {sttAvailable && (
              <button
                type="button"
                onClick={handleToggleListening}
                aria-label={t('assistant.voiceInput')}
                title={isListening ? (t('assistant.voiceStop') || 'Stop') : t('assistant.voiceInput')}
                className={cx(
                  'h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                  isListening
                    ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-2 scale-105 animate-pulse'
                    : 'border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5 shadow-xs active:scale-95'
                )}
              >
                {isListening ? <MicOff size={16} className="font-bold" /> : <Mic size={16} />}
              </button>
            )}

            {/* Send Button Matching Assistant Page Theme */}
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label={t('assistant.send')}
              title={t('assistant.send')}
              className={cx(
                'h-10 w-10 sm:h-11 sm:w-11 rounded-2xl flex items-center justify-center transition-all duration-200 shrink-0 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50',
                text.trim() && !sending
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/25 active:scale-95 hover:scale-[1.02]'
                  : 'border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/[0.04] text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
              )}
            >
              <Send size={15} className="stroke-[2.2]" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
