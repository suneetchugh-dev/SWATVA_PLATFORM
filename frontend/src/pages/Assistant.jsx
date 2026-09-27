import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import { api } from '../api/client'
import { Badge, Banner, Button, Card, PageHeader, StatusPill, cx } from '../components/ui'
import AIOrbFace from '../components/AIOrbFace'
import { playClick } from '../utils/soundFx'
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speakText,
  stopSpeaking,
  createSpeechRecognizer,
} from '../utils/speech'

/**
 * The assistant. The backend degrades rather than failing: with no LLM key
 * configured, `grounded` comes back false and the reply is deterministic. The UI
 * says so plainly instead of pretending — a citizen making a benefits decision
 * deserves to know whether they are reading a model or a rule.
 */
// Openers are i18n keys under assistant.openers.*. The backend normalises the
// language field itself (en / hi / kn), so we just forward what is active.
const OPENER_KEYS = ['0', '1', '2']

export default function Assistant() {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sawUngrounded, setSawUngrounded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [activeSpeakingIndex, setActiveSpeakingIndex] = useState(null)
  const [voiceNotice, setVoiceNotice] = useState(null)

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
    setMessages((m) => [...m, { role: 'user', content: message }])
    setSending(true)
    try {
      const res = await api.chat.send(message, sessionId, i18n.resolvedLanguage)
      if (res?.sessionId) setSessionId(res.sessionId)
      if (res?.grounded === false) setSawUngrounded(true)
      const assistantReply = res?.reply ?? t('assistant.failedBody')
      
      setMessages((m) => {
        const newIdx = m.length
        // Auto-readout if setting enabled in Preferences
        const autoTts = typeof window !== 'undefined' && localStorage.getItem('swatva_sound_tts') !== 'off'
        if (autoTts && ttsAvailable) {
          setTimeout(() => {
            handleToggleSpeak(newIdx, assistantReply)
          }, 200)
        }
        return [
          ...m,
          {
            role: 'assistant',
            content: assistantReply,
            grounded: res?.grounded,
            citations: res?.citations ?? [],
            benefits: res?.surfacedBenefits ?? [],
            readiness: res?.readinessScore,
          },
        ]
      })
    } catch (err) {
      setError(err?.message || t('assistant.errorBody'))
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: t('assistant.failedBody'), error: true },
      ])
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
          setText((prev) => {
            // update with interim feedback
            return interim
          })
        },
        onResult: (final) => {
          setText(final)
          setVoiceNotice(null)
          setIsListening(false)
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

  return (
    <div className="flex flex-col h-[calc(100dvh-13rem)]">
      <PageHeader
        title={t('assistant.title')}
        desc={t('assistant.desc')}
        className="mb-4"
      />

      {sawUngrounded ? (
        <div className="mb-3 shrink-0">
          <Banner tone="info" title={t('assistant.ungroundedTitle')}>
            {t('assistant.ungroundedBody')}
          </Banner>
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 shrink-0">
          <Banner tone="error" title={t('assistant.errorTitle')}>{error}</Banner>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto rounded-2xl border border-neutral-200 dark:border-white/10 p-4 sm:p-5 bg-white/50 dark:bg-white/[0.02]">
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
          <div className="flex flex-col gap-4">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2.5 max-w-[92%] group">
                  <AIOrbFace size={28} state={m.error ? 'error' : activeSpeakingIndex === i ? 'speaking' : 'done'} className="flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div
                      className={cx(
                        'relative rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                        m.error
                          ? 'border border-amber-600/40 bg-amber-500/10'
                          : 'bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10',
                      )}
                    >
                      {m.content}

                      {/* TTS Speak / Stop Button for assistant message */}
                      {ttsAvailable && !m.error ? (
                        <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(i, m.content)}
                            aria-label={activeSpeakingIndex === i ? t('assistant.voiceStop') : t('assistant.voiceSpeak')}
                            title={activeSpeakingIndex === i ? t('assistant.voiceStop') : t('assistant.voiceSpeak')}
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
                                <span className="text-[11px] font-semibold">{t('assistant.voiceStop')}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={13} />
                                <span className="text-[11px]">{t('assistant.voiceSpeak')}</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {m.readiness ? (
                      <div className="mt-2.5">
                        <Card accent className="p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold">{t('assistant.readiness')}</span>
                            <span className="mono-badge text-amber-700 dark:text-amber-400">
                              {m.readiness.readinessPercentage}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${m.readiness.readinessPercentage}%` }} />
                          </div>
                          <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-300">
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
                      <div className="mt-2.5 flex flex-col gap-1.5">
                        {m.benefits.map((b) => (
                          <Card key={b.schemeId} className="p-3">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <StatusPill status={b.matchStatus} />
                              <span className="mono-badge text-neutral-400">{b.matchPercentage}%</span>
                            </div>
                            <p className="text-xs font-semibold text-balance">{b.schemeName}</p>
                            {b.officialSourceUrl ? (
                              <a
                                href={b.officialSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
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
                      <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {t('assistant.sources', { list: m.citations.slice(0, 3).join(' · ') })}
                      </p>
                    ) : null}
                  </div>
                </div>
              ),
            )}
            {sending ? (
              <div className="flex items-center gap-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                <AIOrbFace size={24} state="thinking" className="flex-shrink-0" />
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('assistant.thinking')}
                </span>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {voiceNotice ? (
        <div className="mt-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 dark:bg-amber-400/[0.08] backdrop-blur-md border border-amber-500/25 dark:border-amber-400/20 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between shadow-xs animate-fade-in">
          <span className="flex items-center gap-2.5 font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            </span>
            <span>{voiceNotice}</span>
          </span>
          {isListening ? (
            <button
              type="button"
              onClick={handleToggleListening}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 dark:bg-amber-400/20 dark:hover:bg-amber-400/30 text-amber-950 dark:text-amber-100 border border-amber-500/30 dark:border-amber-400/25 transition-all duration-150 cursor-pointer"
            >
              {t('assistant.voiceStop')}
            </button>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={(e) => { e.preventDefault(); send() }}
        className="mt-3 shrink-0 flex items-end gap-2"
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
          placeholder={isListening ? t('assistant.voiceListening') : t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
          className={cx(
            'flex-1 resize-none rounded-2xl px-4 py-3 text-sm bg-white/70 dark:bg-white/[0.04] border transition-all duration-200 focus:outline-none max-h-32 min-h-[46px]',
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
          title={isListening ? t('assistant.voiceStop') : t('assistant.voiceInput')}
          className={cx(
            'h-[46px] w-[46px] rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 select-none',
            isListening
              ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-obsidian scale-105 animate-pulse'
              : 'border border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5 shadow-xs'
          )}
        >
          {isListening ? <MicOff size={18} className="font-bold" /> : <Mic size={18} />}
        </button>

        <Button type="submit" variant="accent" disabled={!text.trim() || sending} aria-label={t('assistant.send')}>
          <Send size={15} />
        </Button>
      </form>
    </div>
  )
}

