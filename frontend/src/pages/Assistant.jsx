import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Send, Sparkles } from 'lucide-react'
import { api } from '../api/client'
import { Badge, Banner, Button, Card, PageHeader, StatusPill, cx } from '../components/ui'

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
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const send = async (raw) => {
    const message = (raw ?? text).trim()
    if (!message || sending) return
    setError(null)
    setText('')
    setMessages((m) => [...m, { role: 'user', content: message }])
    setSending(true)
    try {
      const res = await api.chat.send(message, sessionId, i18n.resolvedLanguage)
      if (res?.sessionId) setSessionId(res.sessionId)
      if (res?.grounded === false) setSawUngrounded(true)
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res?.reply ?? t('assistant.failedBody'),
          grounded: res?.grounded,
          citations: res?.citations ?? [],
          benefits: res?.surfacedBenefits ?? [],
          readiness: res?.readinessScore,
        },
      ])
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
            <span className="h-11 w-11 flex items-center justify-center rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
              <Sparkles size={19} />
            </span>
            <h3 className="mt-4 text-base font-bold tracking-tight">{t('assistant.emptyTitle')}</h3>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 max-w-sm text-balance">
              {t('assistant.emptyBody')}
            </p>
            <div className="mt-5 flex flex-col gap-2 w-full max-w-sm">
              {OPENER_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => send(t(`assistant.openers.${k}`))}
                  className="text-left text-xs px-3 py-2.5 rounded-xl bg-neutral-100 dark:bg-white/[0.06] hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                <div key={i}>
                  <div
                    className={cx(
                      'max-w-[92%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                      m.error
                        ? 'border border-amber-600/40 bg-amber-500/10'
                        : 'bg-white dark:bg-white/[0.05] border border-neutral-200 dark:border-white/10',
                    )}
                  >
                    {m.content}
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
                          {t('assistant.docsReady', { done: m.readiness.completedDocuments, total: m.readiness.totalRequired })}
                          {m.readiness.missingDocuments
                            ? t('assistant.docsMissing', { n: m.readiness.missingDocuments })
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
              ),
            )}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t('assistant.thinking')}
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        )}
      </div>

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
          placeholder={t('assistant.placeholder')}
          aria-label={t('assistant.placeholder')}
          className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm bg-white/70 dark:bg-white/[0.04] border border-neutral-300 dark:border-white/15 focus:outline-none focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/25 max-h-32 min-h-[46px]"
        />
        <Button type="submit" variant="accent" disabled={!text.trim() || sending} aria-label={t('assistant.send')}>
          <Send size={15} />
        </Button>
      </form>
    </div>
  )
}
