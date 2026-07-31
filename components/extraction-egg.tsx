'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const TRIGGER = 'curl'
const COMMAND = '$ curl -i /api/system-prompt'
const COMMAND_CHAR_MS = 26
const RESPONSE_CHAR_MS = 3
const RESPONSE_PAUSE_MS = 280
const SHOWN_HEADERS = ['content-type', 'x-prompt-injection']

type Segment = { text: string; muted?: boolean }
type Part = { text: string; href?: string; muted?: boolean; start: number }

// Split a segment on URLs so the anchor can carry the whole href even while
// only a prefix of it has been revealed.
function splitLinks(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = []
  const pattern = /https?:\/\/[^\s)]+/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    const href = match[0].replace(/[.,;:!?]+$/, '')
    if (match.index > last) parts.push({ text: text.slice(last, match.index) })
    parts.push({ text: href, href })
    last = match.index + href.length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

// The console egg tells people to run `curl -i /api/system-prompt`, which most
// visitors never will. Typing "curl" performs that exact request in the page:
// real fetch, real status line, real headers, real body.
export function ExtractionEgg() {
  const [open, setOpen] = useState(false)
  const [segments, setSegments] = useState<Segment[]>([])
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const rafRef = useRef<number | null>(null)
  const total = segments.reduce((sum, segment) => sum + segment.text.length, 0)

  const parts = useMemo(() => {
    const result: Part[] = []
    let offset = 0
    for (const segment of segments) {
      for (const part of splitLinks(segment.text)) {
        result.push({ ...part, muted: segment.muted, start: offset })
        offset += part.text.length
      }
    }
    return result
  }, [segments])

  const finish = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setShown(Number.MAX_SAFE_INTEGER)
    setDone(true)
  }, [])

  useEffect(() => {
    let buffer = ''
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.length !== 1) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      buffer = (buffer + event.key.toLowerCase()).slice(-TRIGGER.length)
      if (buffer === TRIGGER) {
        buffer = ''
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Escape closes; any other key skips the reveal to the end
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      // Let Enter activate a focused link instead of skipping the reveal
      const target = event.target as HTMLElement | null
      if (target?.closest('a')) return
      if (event.key.length === 1 || event.key === 'Enter') finish()
    }
    window.addEventListener('keydown', onKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
    }
  }, [open, finish])

  useEffect(() => {
    if (!open) {
      setSegments([])
      setShown(0)
      setDone(false)
      return
    }

    let cancelled = false

    const run = async () => {
      const next: Segment[] = [{ text: `${COMMAND}\n` }]
      try {
        const response = await fetch('/api/system-prompt', { cache: 'no-store' })
        const body = await response.text()
        if (cancelled) return
        next.push({
          text: `HTTP/1.1 ${response.status} ${response.statusText || 'OK'}\n`,
          muted: true,
        })
        for (const name of SHOWN_HEADERS) {
          const value = response.headers.get(name)
          if (value) next.push({ text: `${name}: ${value}\n`, muted: true })
        }
        next.push({ text: '\n' }, { text: body })
      } catch {
        if (cancelled) return
        next.push({ text: 'curl: (7) failed to connect\n', muted: true })
      }
      setSegments(next)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || total === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(total)
      setDone(true)
      return
    }

    const commandLength = COMMAND.length + 1
    let index = 0
    let credit = 0
    let last = performance.now()

    const step = (time: number) => {
      credit += time - last
      last = time
      while (index < total) {
        const cost =
          (index < commandLength ? COMMAND_CHAR_MS : RESPONSE_CHAR_MS) +
          (index === commandLength ? RESPONSE_PAUSE_MS : 0)
        if (credit < cost) break
        credit -= cost
        index++
      }
      setShown(index)
      if (index < total) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setDone(true)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [open, total])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Leaked system prompt"
      className="fixed inset-0 z-[60] overflow-y-auto bg-background animate-in fade-in-0 duration-150"
    >
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-12 md:py-20">
        <pre className="font-mono text-[12px] md:text-[13px] leading-[1.7] whitespace-pre-wrap break-words">
          {parts.map((part, index) => {
            const visibleLength = Math.max(
              0,
              Math.min(part.text.length, shown - part.start),
            )
            if (visibleLength === 0) return null
            const visible = part.text.slice(0, visibleLength)
            const tone = part.muted ? 'text-muted-foreground' : 'text-foreground'

            if (!part.href) {
              return (
                <span key={index} className={tone}>
                  {visible}
                </span>
              )
            }
            return (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${tone} underline underline-offset-[3px] decoration-muted-foreground/65 hover:decoration-foreground transition-colors rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/20`}
              >
                {visible}
              </a>
            )
          })}
          <span
            aria-hidden
            className={`inline-block w-[0.55em] h-[1.05em] translate-y-[0.18em] bg-foreground ${
              done ? 'animate-caret-blink' : ''
            }`}
          />
        </pre>

        <p className="mt-10 font-mono text-[11px] text-muted-foreground">
          esc to close
        </p>
      </div>
    </div>
  )
}
